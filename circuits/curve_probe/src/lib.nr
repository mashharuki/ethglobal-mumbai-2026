use std::embedded_curve_ops::{
    embedded_curve_add, EmbeddedCurvePoint, EmbeddedCurveScalar, fixed_base_scalar_mul,
    multi_scalar_mul,
};

fn nonzero_scalar(value: u128) -> EmbeddedCurveScalar {
    assert(value != 0, "group scalar must be nonzero");
    EmbeddedCurveScalar { lo: value as Field, hi: 0 }
}

#[test]
fn should_multiply_generator_with_bounded_scalars() {
    let generator = fixed_base_scalar_mul(nonzero_scalar(1));
    let twice = fixed_base_scalar_mul(nonzero_scalar(2));
    let sum = embedded_curve_add(generator, generator);
    assert(twice.x == sum.x);
    assert(twice.y == sum.y);
    let combined = multi_scalar_mul(
        [generator, generator],
        [nonzero_scalar(1), nonzero_scalar(1)],
    );
    assert(combined.x == twice.x);
    assert(combined.y == twice.y);
}

#[test(should_fail_with = "group scalar must be nonzero")]
fn should_reject_zero_group_scalar() {
    let point: EmbeddedCurvePoint = fixed_base_scalar_mul(nonzero_scalar(0));
    assert(point.x != 0);
}
