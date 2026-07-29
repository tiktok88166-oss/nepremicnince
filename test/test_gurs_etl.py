import unittest

from scripts.build_gurs_enriched_data import (
    calculate_rent_eur_m2,
    key_text,
    transformed_point,
    valuation_coverage,
)


class GursEtlTests(unittest.TestCase):
    def test_key_normalization_preserves_parcel_syntax(self):
        self.assertEqual(key_text(" 1126/26 "), "1126/26")
        self.assertEqual(key_text("*56"), "*56")
        self.assertEqual(key_text("4815.0"), "4815")
        self.assertEqual(key_text("0012"), "0012")

    def test_rent_per_m2_uses_only_permitted_price(self):
        self.assertEqual(calculate_rent_eur_m2(500, 900, 50, 2), 10)
        self.assertEqual(calculate_rent_eur_m2(None, 900, 50, 1), 18)
        self.assertIsNone(calculate_rent_eur_m2(None, 900, 50, 2))

    def test_valuation_coverage(self):
        self.assertEqual(valuation_coverage(0, 3), "none")
        self.assertEqual(valuation_coverage(2, 3), "partial")
        self.assertEqual(valuation_coverage(3, 3), "complete")

    def test_coordinate_transform_is_in_slovenia(self):
        longitude, latitude = transformed_point(453763.77, 95734.67)
        self.assertTrue(13 <= longitude <= 17)
        self.assertTrue(45 <= latitude <= 47.5)


if __name__ == "__main__":
    unittest.main()
