from datetime import date, datetime
from types import SimpleNamespace

import pytest

from app.models.vehicle import VehicleType
from app.services.pico_y_placa import (
    compute_pico_y_placa,
    get_effective_pyp,
    is_festivo,
)


class TestComputePicoYPlaca:
    @pytest.mark.parametrize(
        "last_digit,expected_day",
        [
            ("5", "Lunes"), ("8", "Lunes"),
            ("1", "Martes"), ("4", "Martes"),
            ("0", "Miércoles"), ("2", "Miércoles"),
            ("3", "Jueves"), ("6", "Jueves"),
            ("7", "Viernes"), ("9", "Viernes"),
        ],
    )
    def test_car_uses_last_plate_digit(self, last_digit, expected_day):
        plate = f"ABC12{last_digit}"
        assert compute_pico_y_placa(plate, "car") == expected_day

    def test_motorcycle_uses_fourth_character(self):
        # index 3 (0-based) is the 4th character: "5" here
        assert compute_pico_y_placa("ABC5DE", "motorcycle") == "Lunes"

    def test_empty_plate_returns_none(self):
        assert compute_pico_y_placa("", "car") is None

    def test_too_short_motorcycle_plate_returns_none_not_raise(self):
        # len("AB") == 2, so plate[3] would raise IndexError — must be caught
        assert compute_pico_y_placa("AB", "motorcycle") is None

    def test_lowercase_and_whitespace_are_normalized(self):
        assert compute_pico_y_placa("  abc125 ", "car") == compute_pico_y_placa("ABC125", "car")


class TestIsFestivo:
    def test_known_holidays_are_festivos(self):
        assert is_festivo(date(2026, 1, 1)) is True
        assert is_festivo(date(2026, 12, 25)) is True
        assert is_festivo(date(2027, 7, 20)) is True

    def test_arbitrary_weekday_is_not_festivo(self):
        assert is_festivo(date(2026, 9, 16)) is False


class TestGetEffectivePyp:
    def _vehicle(self, **overrides):
        base = dict(
            license_plate="ABC125",  # last digit 5 -> Lunes
            vehicle_type=VehicleType.car,
            pyp_day_override=None,
            pyp_valid_from=None,
            pyp_valid_to=None,
        )
        base.update(overrides)
        return SimpleNamespace(**base)

    def test_falls_back_to_computed_value_with_no_override(self):
        vehicle = self._vehicle()
        assert get_effective_pyp(vehicle, date(2026, 9, 16)) == "Lunes"

    def test_override_wins_when_no_range_is_set(self):
        vehicle = self._vehicle(pyp_day_override="Viernes")
        assert get_effective_pyp(vehicle, date(2026, 9, 16)) == "Viernes"

    def test_override_wins_inside_date_range(self):
        vehicle = self._vehicle(
            pyp_day_override="Viernes",
            pyp_valid_from=date(2026, 9, 1),
            pyp_valid_to=date(2026, 9, 30),
        )
        assert get_effective_pyp(vehicle, date(2026, 9, 16)) == "Viernes"

    def test_override_ignored_outside_date_range_falls_back_to_computed(self):
        vehicle = self._vehicle(
            pyp_day_override="Viernes",
            pyp_valid_from=date(2026, 9, 1),
            pyp_valid_to=date(2026, 9, 30),
        )
        assert get_effective_pyp(vehicle, date(2026, 10, 1)) == "Lunes"

    def test_override_with_only_valid_from_set(self):
        vehicle = self._vehicle(pyp_day_override="Viernes", pyp_valid_from=date(2026, 9, 1))
        assert get_effective_pyp(vehicle, date(2026, 12, 31)) == "Viernes"
        assert get_effective_pyp(vehicle, date(2026, 1, 1)) == "Lunes"

    def test_datetime_bounds_are_handled_like_date_bounds(self):
        vehicle = self._vehicle(
            pyp_day_override="Viernes",
            pyp_valid_from=datetime(2026, 9, 1, 8, 0),
            pyp_valid_to=datetime(2026, 9, 30, 20, 0),
        )
        assert get_effective_pyp(vehicle, date(2026, 9, 16)) == "Viernes"
        assert get_effective_pyp(vehicle, date(2026, 10, 1)) == "Lunes"
