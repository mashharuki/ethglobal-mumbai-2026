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
    let hobby = item_commitment(101, bit_hash(hobbies), salts[0], context);
    let own_gender = item_commitment(102, bit_hash(gender), salts[1], context);
    let own_intent = item_commitment(103, bit_hash(intent), salts[2], context);
    let gender_mask = item_commitment(104, bit_hash(accepts_gender), salts[3], context);
    let intent_mask = item_commitment(105, bit_hash(accepts_intent), salts[4], context);
    let own_job = item_commitment(106, pedersen_hash([job as Field]), salts[5], context);
    let own_age = item_commitment(107, pedersen_hash([age_band as Field]), salts[6], context);
    pedersen_hash(
        [9001, hobby, own_gender, own_intent, gender_mask, intent_mask, own_job, own_age],
    )
}

fn scalar(value: u128) -> EmbeddedCurveScalar {
    assert(value != 0, "mask and rerandomization must be nonzero");
    EmbeddedCurveScalar { lo: value as Field, hi: 0 }
}

fn point(x: Field, y: Field) -> EmbeddedCurvePoint {
    EmbeddedCurvePoint { x, y }
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
    first_x: [Field; 288],
    first_y: [Field; 288],
    second_x: [Field; 288],
    second_y: [Field; 288],
    mask: u128,
    rerandomness: u128,
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
    output_first_x: pub Field,
    output_first_y: pub Field,
    output_second_x: pub Field,
    output_second_y: pub Field,
) {
    assert(schema_version == 1, "unsupported schema version");
    assert(dictionary_version == 1, "unsupported dictionary version");
    assert(profile_version != 0);
    assert((subject_lo != 0) | (subject_hi != 0));
    assert((issuance_lo != 0) | (issuance_hi != 0));
    assert(session_digest != 0);
    let context = [
        schema_version,
        dictionary_version,
        subject_lo as Field,
        subject_hi as Field,
        issuance_lo as Field,
        issuance_hi as Field,
        profile_version,
    ];
    assert(
        registration_root(
            hobbies,
            gender,
            intent,
            accepts_gender,
            accepts_intent,
            job,
            age_band,
            salts,
            context,
        )
            == root,
        "registration root mismatch",
    );

    let vector = derive_vector(hobbies, gender, intent, accepts_gender, accepts_intent, 1);
    let public_key = point(public_key_x, public_key_y);
    let mut digest = pedersen_hash([9101, session_digest, public_key_x, public_key_y]);
    let mut first_points: [EmbeddedCurvePoint; 288] = [point(0, 0); 288];
    let mut second_points: [EmbeddedCurvePoint; 288] = [point(0, 0); 288];
    let mut bits: [EmbeddedCurveScalar; 288] = [EmbeddedCurveScalar { lo: 0, hi: 0 }; 288];
    for index in 0..288 {
        first_points[index] = point(first_x[index], first_y[index]);
        second_points[index] = point(second_x[index], second_y[index]);
        bits[index] = EmbeddedCurveScalar { lo: vector[index] as Field, hi: 0 };
        digest = pedersen_hash([
            digest,
            first_x[index],
            first_y[index],
            second_x[index],
            second_y[index],
        ]);
    }
    assert(digest == ciphertext_digest, "A ciphertext digest mismatch");
    let selected_first = multi_scalar_mul(first_points, bits);
    let selected_second = multi_scalar_mul(second_points, bits);
    let generator = fixed_base_scalar_mul(scalar(1));
    let final_first = multi_scalar_mul(
        [selected_first, generator],
        [scalar(mask), scalar(rerandomness)],
    );
    let final_second = multi_scalar_mul(
        [selected_second, public_key],
        [scalar(mask), scalar(rerandomness)],
    );
    assert(final_first.x == output_first_x);
    assert(final_first.y == output_first_y);
    assert(final_second.x == output_second_x);
    assert(final_second.y == output_second_y);
}

#[test]
fn should_match_b_registration_root_for_synthetic_fixture() {
    let root = registration_root(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [1, 0, 0],
        [1, 0],
        202,
        302,
        [21, 22, 23, 24, 25, 26, 27],
        [1, 1, 42, 0, 52, 0, 1],
    );
    assert(root == 0x25a723e029b143b4716d686dd26ecd6b449857bf191a8b0ee777debb9c9d2178);
}

#[test(should_fail_with = "mask and rerandomization must be nonzero")]
fn should_reject_zero_mask() {
    let zero = scalar(0);
    assert(zero.lo != 0);
}
