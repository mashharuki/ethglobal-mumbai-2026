use std::embedded_curve_ops::{
    EmbeddedCurvePoint, EmbeddedCurveScalar, fixed_base_scalar_mul, multi_scalar_mul,
};
use std::hash::pedersen_hash;

fn main(
    secret_key: u128,
    session_digest: pub Field,
    ciphertext_digest: pub Field,
    public_key_x: pub Field,
    public_key_y: pub Field,
    output_first_x: pub Field,
    output_first_y: pub Field,
    output_second_x: pub Field,
    output_second_y: pub Field,
    transcript_digest: pub Field,
    compatible: pub bool,
) {
    assert(secret_key != 0, "secret key must be nonzero");
    assert(session_digest != 0);
    assert(ciphertext_digest != 0);
    let scalar = EmbeddedCurveScalar { lo: secret_key as Field, hi: 0 };
    let public_key = fixed_base_scalar_mul(scalar);
    assert(public_key.x == public_key_x);
    assert(public_key.y == public_key_y);
    let transcript = pedersen_hash([
        9102,
        session_digest,
        ciphertext_digest,
        public_key_x,
        public_key_y,
        output_first_x,
        output_first_y,
        output_second_x,
        output_second_y,
    ]);
    assert(transcript == transcript_digest, "result transcript mismatch");
    let first = EmbeddedCurvePoint { x: output_first_x, y: output_first_y };
    let shared = multi_scalar_mul([first], [scalar]);
    let is_zero = (shared.x == output_second_x) & (shared.y == output_second_y);
    assert(compatible == !is_zero, "match result mismatch");
}

#[test(should_fail_with = "secret key must be nonzero")]
fn should_reject_zero_secret_key() {
    main(0, 1, 1, 1, 1, 1, 1, 1, 1, 1, false);
}
