use std::hash::pedersen_hash;

fn bit_hash<let N: u32>(bits: [u8; N]) -> Field {
    let mut values: [Field; N] = [0; N];
    for index in 0..N {
        values[index] = bits[index] as Field;
    }
    pedersen_hash(values)
}

fn item_commitment(tag: Field, value_hash: Field, salt: Field, context: [Field; 7]) -> Field {
    assert(salt != 0, "item salt must be nonzero");
    pedersen_hash([
        tag, context[0], context[1], context[2], context[3], context[4], context[5], context[6],
        salt, value_hash,
    ])
}

fn count_bits<let N: u32>(bits: [u8; N]) -> u32 {
    let mut count: u32 = 0;
    for index in 0..N {
        assert(bits[index] < 2, "profile bit must be binary");
        count += bits[index] as u32;
    }
    count
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

fn main(
    hobbies: [u8; 8],
    gender: [u8; 3],
    intent: [u8; 2],
    accepts_gender: [u8; 3],
    accepts_intent: [u8; 2],
    job: u16,
    age_band: u16,
    salts: [Field; 7],
    schema_version: pub Field,
    dictionary_version: pub Field,
    subject_lo: pub u128,
    subject_hi: pub u128,
    issuance_lo: pub u128,
    issuance_hi: pub u128,
    profile_version: pub Field,
    root: pub Field,
) {
    assert(schema_version == 1, "unsupported schema version");
    assert(dictionary_version == 1, "unsupported dictionary version");
    assert(profile_version != 0, "profile version must be positive");
    assert((subject_lo != 0) | (subject_hi != 0));
    assert((issuance_lo != 0) | (issuance_hi != 0));
    assert((job >= 201) & (job <= 203), "job outside synthetic dictionary");
    assert((age_band >= 301) & (age_band <= 303), "age band outside synthetic dictionary");
    assert(count_bits(hobbies) > 0, "hobbies must be nonempty");
    assert(count_bits(gender) == 1, "gender must be one-hot");
    assert(count_bits(intent) == 1, "intent must be one-hot");
    assert(count_bits(accepts_gender) > 0, "gender mask must be nonempty");
    assert(count_bits(accepts_intent) > 0, "intent mask must be nonempty");

    let context = [
        schema_version,
        dictionary_version,
        subject_lo as Field,
        subject_hi as Field,
        issuance_lo as Field,
        issuance_hi as Field,
        profile_version,
    ];
    let computed = registration_root(
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
    assert(computed == root, "registration root mismatch");
}

#[test]
fn should_register_valid_synthetic_profile() {
    let hobbies = [1, 1, 0, 0, 0, 0, 0, 0];
    let gender = [1, 0, 0];
    let intent = [1, 0];
    let accepts_gender = [0, 1, 0];
    let accepts_intent = [0, 1];
    let salts = [11, 12, 13, 14, 15, 16, 17];
    let root = registration_root(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        [1, 1, 41, 0, 51, 0, 1],
    );
    main(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        root,
    );
}

#[test(should_fail_with = "gender must be one-hot")]
fn should_reject_two_gender_categories() {
    main(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 1, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        201,
        301,
        [11, 12, 13, 14, 15, 16, 17],
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}

#[test(should_fail_with = "registration root mismatch")]
fn should_reject_changed_registration_owner() {
    let hobbies = [1, 1, 0, 0, 0, 0, 0, 0];
    let gender = [1, 0, 0];
    let intent = [1, 0];
    let accepts_gender = [0, 1, 0];
    let accepts_intent = [0, 1];
    let salts = [11, 12, 13, 14, 15, 16, 17];
    let root = registration_root(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        [1, 1, 41, 0, 51, 0, 1],
    );
    main(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        1,
        1,
        42,
        0,
        51,
        0,
        1,
        root,
    );
}

#[test(should_fail_with = "item salt must be nonzero")]
fn should_reject_zero_item_salt() {
    main(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        201,
        301,
        [0, 12, 13, 14, 15, 16, 17],
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}

#[test(should_fail_with = "profile bit must be binary")]
fn should_reject_nonbinary_hobby() {
    main(
        [2, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        201,
        301,
        [11, 12, 13, 14, 15, 16, 17],
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}

#[test(should_fail_with = "hobbies must be nonempty")]
fn should_reject_empty_hobby_selection() {
    main(
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        201,
        301,
        [11, 12, 13, 14, 15, 16, 17],
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}

#[test(should_fail_with = "intent mask must be nonempty")]
fn should_reject_empty_preference() {
    main(
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 0],
        201,
        301,
        [11, 12, 13, 14, 15, 16, 17],
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}

#[test(should_fail_with = "unsupported dictionary version")]
fn should_reject_other_dictionary_version() {
    main(
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        201,
        301,
        [11, 12, 13, 14, 15, 16, 17],
        1,
        2,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}

#[test(should_fail_with = "registration root mismatch")]
fn should_reject_other_issuance_generation() {
    let hobbies = [1, 1, 0, 0, 0, 0, 0, 0];
    let gender = [1, 0, 0];
    let intent = [1, 0];
    let accepts_gender = [0, 1, 0];
    let accepts_intent = [0, 1];
    let salts = [11, 12, 13, 14, 15, 16, 17];
    let root = registration_root(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        [1, 1, 41, 0, 51, 0, 1],
    );
    main(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        1,
        1,
        41,
        0,
        52,
        0,
        1,
        root,
    );
}

#[test]
fn should_accept_unspecified_preference_mask() {
    let hobbies = [1, 0, 0, 0, 0, 0, 0, 0];
    let gender = [1, 0, 0];
    let intent = [1, 0];
    let accepts_gender = [1, 1, 1];
    let accepts_intent = [1, 1];
    let salts = [11, 12, 13, 14, 15, 16, 17];
    let root = registration_root(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        [1, 1, 41, 0, 51, 0, 1],
    );
    main(
        hobbies,
        gender,
        intent,
        accepts_gender,
        accepts_intent,
        201,
        301,
        salts,
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        root,
    );
}

#[test(should_fail_with = "job outside synthetic dictionary")]
fn should_reject_unknown_job() {
    main(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        999,
        301,
        [11, 12, 13, 14, 15, 16, 17],
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}

#[test(should_fail_with = "age band outside synthetic dictionary")]
fn should_reject_unknown_age_band() {
    main(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        201,
        999,
        [11, 12, 13, 14, 15, 16, 17],
        1,
        1,
        41,
        0,
        51,
        0,
        1,
        1,
    );
}
