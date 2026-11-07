use profile::derive_vector;
use std::embedded_curve_ops::{
    EmbeddedCurvePoint, EmbeddedCurveScalar, fixed_base_scalar_mul, multi_scalar_mul,
};
use std::hash::pedersen_hash;

fn bit_hash<let N: u32>(bits: [u8; N]) -> Field {
    let mut fields: [Field; N] = [0; N];
    for index in 0..N {
        fields[index] = bits[index] as Field;
    }
    pedersen_hash(fields)
}

fn item_commitment(tag: Field, value_hash: Field, salt: Field, context: [Field; 7]) -> Field {
    assert(salt != 0, "item salt must be nonzero");
    pedersen_hash([
        tag, context[0], context[1], context[2], context[3], context[4], context[5], context[6],
        salt, value_hash,
    ])
}

fn registration_root(
    hobbies: [u8; 8],
    gender: [u8; 3],
    intent: [u8; 2],
    accepts_gender: [u8; 3],
    accepts_intent: [u8; 2],
    job: u16,
    age_band: u16,
    salts: [Field; 7],
    context: [Field; 7],
) -> Field {
    assert((job >= 201) & (job <= 203));
    assert((age_band >= 301) & (age_band <= 303));
    let hobby_commitment = item_commitment(101, bit_hash(hobbies), salts[0], context);
    let gender_commitment = item_commitment(102, bit_hash(gender), salts[1], context);
    let intent_commitment = item_commitment(103, bit_hash(intent), salts[2], context);
    let gender_mask_commitment = item_commitment(104, bit_hash(accepts_gender), salts[3], context);
    let intent_mask_commitment = item_commitment(105, bit_hash(accepts_intent), salts[4], context);
    let job_commitment = item_commitment(106, pedersen_hash([job as Field]), salts[5], context);
    let age_commitment =
        item_commitment(107, pedersen_hash([age_band as Field]), salts[6], context);
    pedersen_hash([
        9001,
        hobby_commitment,
        gender_commitment,
        intent_commitment,
        gender_mask_commitment,
        intent_mask_commitment,
        job_commitment,
        age_commitment,
    ])
}

fn scalar(value: u128) -> EmbeddedCurveScalar {
    assert(value != 0, "encryption scalar must be nonzero");
    EmbeddedCurveScalar { lo: value as Field, hi: 0 }
}

fn encrypt_bit(
    bit: u8,
    randomness: u128,
    public_key: EmbeddedCurvePoint,
) -> [EmbeddedCurvePoint; 2] {
    let generator = fixed_base_scalar_mul(scalar(1));
    let first = fixed_base_scalar_mul(scalar(randomness));
    let second = multi_scalar_mul(
        [public_key, generator],
        [scalar(randomness), EmbeddedCurveScalar { lo: bit as Field, hi: 0 }],
    );
    [first, second]
}

fn main(
    hobbies: [u8; 8],
    gender: [u8; 3],
    intent: [u8; 2],
    accepts_gender: [u8; 3],
    accepts_intent: [u8; 2],
    job: u16,
    age_band: u16,
    salts: [Field; 7],
    secret_key: u128,
    randomness: [u128; 288],
    first_x: [Field; 288],
    first_y: [Field; 288],
    second_x: [Field; 288],
    second_y: [Field; 288],
    schema_version: pub Field,
    dictionary_version: pub Field,
    subject_lo: pub u128,
    subject_hi: pub u128,
    issuance_lo: pub u128,
    issuance_hi: pub u128,
    profile_version: pub Field,
    root: pub Field,
    session_digest: pub Field,
    public_key_x: pub Field,
    public_key_y: pub Field,
    ciphertext_digest: pub Field,
) {
    assert(schema_version == 1, "unsupported schema version");
    assert(dictionary_version == 1, "unsupported dictionary version");
    assert(profile_version != 0);
    assert((subject_lo != 0) | (subject_hi != 0), "subject must be nonzero");
    assert((issuance_lo != 0) | (issuance_hi != 0), "issuance must be nonzero");
    assert(session_digest != 0, "session digest must be nonzero");
    let context = [
        schema_version,
        dictionary_version,
        subject_lo as Field,
        subject_hi as Field,
        issuance_lo as Field,
        issuance_hi as Field,
        profile_version,
    ];
    let computed_root = registration_root(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        job,
        age_band,
        salts,
        context,
    );
    assert(computed_root == root, "registration root mismatch");

    let vector = derive_vector(hobbies, gender, intent, accepts_gender, accepts_intent, 0);
    let public_key = fixed_base_scalar_mul(scalar(secret_key));
    assert(public_key.x == public_key_x);
    assert(public_key.y == public_key_y);
    let mut digest = pedersen_hash([9101, session_digest, public_key_x, public_key_y]);
    for index in 0..288 {
        let ciphertext = encrypt_bit(vector[index], randomness[index], public_key);
        assert(ciphertext[0].x == first_x[index]);
        assert(ciphertext[0].y == first_y[index]);
        assert(ciphertext[1].x == second_x[index]);
        assert(ciphertext[1].y == second_y[index]);
        digest = pedersen_hash([
            digest,
            first_x[index],
            first_y[index],
            second_x[index],
            second_y[index],
        ]);
    }
    assert(digest == ciphertext_digest, "ciphertext digest mismatch");
}

#[test]
fn should_match_registration_root_for_synthetic_fixture() {
    let root = registration_root(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        201,
        301,
        [11, 12, 13, 14, 15, 16, 17],
        [1, 1, 41, 0, 51, 0, 1],
    );
    assert(root == 0x105c14d1f8f4dc5e31a9277a47489ed9dac4fc16515c6f3eefdf16ebd6f9cc2d);
}

#[test(should_fail_with = "encryption scalar must be nonzero")]
fn should_reject_zero_encryption_scalar() {
    let value = scalar(0);
    assert(value.lo != 0);
}
