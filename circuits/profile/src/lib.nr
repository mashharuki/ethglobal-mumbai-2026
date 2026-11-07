fn count_bits<let N: u32>(bits: [u8; N]) -> u32 {
    let mut count: u32 = 0;
    for index in 0..N {
        assert(bits[index] < 2, "profile bit must be binary");
        count += bits[index] as u32;
    }
    count
}

pub fn derive_vector(
    hobbies: [u8; 8],
    gender: [u8; 3],
    intent: [u8; 2],
    accepts_gender: [u8; 3],
    accepts_intent: [u8; 2],
    role: u8,
) -> [u8; 288] {
    assert(role < 2, "invalid participant role");
    assert(count_bits(hobbies) > 0, "hobbies must be nonempty");
    assert(count_bits(gender) == 1, "gender must be one-hot");
    assert(count_bits(intent) == 1, "intent must be one-hot");
    assert(count_bits(accepts_gender) > 0, "gender mask must be nonempty");
    assert(count_bits(accepts_intent) > 0, "intent mask must be nonempty");

    let mut vector: [u8; 288] = [0; 288];
    for hobby in 0..8 {
        for gender_a in 0..3 {
            for gender_b in 0..3 {
                for intent_a in 0..2 {
                    for intent_b in 0..2 {
                        let index = (
                            (((hobby * 3 + gender_a) * 3 + gender_b) * 2 + intent_a) * 2 + intent_b
                        );
                        let own_gender = if role == 0 {
                            gender[gender_a]
                        } else {
                            gender[gender_b]
                        };
                        let own_intent = if role == 0 {
                            intent[intent_a]
                        } else {
                            intent[intent_b]
                        };
                        let accepted_gender = if role == 0 {
                            accepts_gender[gender_b]
                        } else {
                            accepts_gender[gender_a]
                        };
                        let accepted_intent = if role == 0 {
                            accepts_intent[intent_b]
                        } else {
                            accepts_intent[intent_a]
                        };
                        vector[index] = hobbies[hobby]
                            * own_gender
                            * own_intent
                            * accepted_gender
                            * accepted_intent;
                    }
                }
            }
        }
    }
    vector
}

fn overlap_count(a: [u8; 288], b: [u8; 288]) -> u32 {
    let mut overlap: u32 = 0;
    for index in 0..288 {
        overlap += (a[index] * b[index]) as u32;
    }
    overlap
}

#[test]
fn should_align_288_coordinates_with_plaintext_oracle() {
    let vector_a = derive_vector(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        0,
    );
    let vector_b = derive_vector(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [1, 0, 0],
        [1, 0],
        1,
    );
    assert(vector_a.len() == 288);
    assert(vector_a[5] == 1);
    assert(vector_a[41] == 1);
    assert(vector_b[41] == 1);
    assert(vector_b[77] == 1);
    assert(overlap_count(vector_a, vector_b) == 1);
}

#[test]
fn should_have_no_overlap_when_hobbies_differ() {
    let vector_a = derive_vector(
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        0,
    );
    let vector_b = derive_vector(
        [0, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [1, 0, 0],
        [1, 0],
        1,
    );
    assert(overlap_count(vector_a, vector_b) == 0);
}

#[test]
fn should_reject_a_gender_preference_mismatch() {
    let a = derive_vector(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 0, 1],
        [0, 1],
        0,
    );
    let b = derive_vector(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [1, 0, 0],
        [1, 0],
        1,
    );
    assert(overlap_count(a, b) == 0);
}

#[test]
fn should_reject_b_gender_preference_mismatch() {
    let a = derive_vector(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        0,
    );
    let b = derive_vector(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [0, 1, 0],
        [1, 0],
        1,
    );
    assert(overlap_count(a, b) == 0);
}

#[test]
fn should_reject_a_intent_preference_mismatch() {
    let a = derive_vector(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [1, 0],
        0,
    );
    let b = derive_vector(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [1, 0, 0],
        [1, 0],
        1,
    );
    assert(overlap_count(a, b) == 0);
}

#[test]
fn should_reject_b_intent_preference_mismatch() {
    let a = derive_vector(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        0,
    );
    let b = derive_vector(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [1, 0, 0],
        [0, 1],
        1,
    );
    assert(overlap_count(a, b) == 0);
}

#[test]
fn should_accept_both_unspecified_preferences() {
    let a = derive_vector(
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [1, 1, 1],
        [1, 1],
        0,
    );
    let b = derive_vector(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0],
        [0, 1],
        [1, 1, 1],
        [1, 1],
        1,
    );
    assert(overlap_count(a, b) == 1);
}

#[test(should_fail_with = "invalid participant role")]
fn should_reject_other_role() {
    let vector = derive_vector(
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0],
        [1, 0],
        [0, 1, 0],
        [0, 1],
        2,
    );
    assert(vector[0] == 1);
}
