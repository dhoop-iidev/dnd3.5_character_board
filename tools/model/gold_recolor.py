"""Recolor the metal parts of a PBR texture set to gold (Fenrir's golden full plate).

Metal is read from the glTF metallicRoughness map (blue = metallic); cloth and leather keep
their colors. With a sword mask (from sword_mask.py), the greatsword's blade becomes polished steel with
a gold central strip, and its guard/grip/pommel stay gold.
Usage: python gold_recolor.py <baseColor> <metallicRoughness> <outBaseColor> <outMetallicRoughness> [<swordMask>]
"""
import sys

import numpy as np
from PIL import Image

GOLD_DARK = np.array([0.20, 0.13, 0.03])
GOLD_MID = np.array([0.83, 0.62, 0.22])
GOLD_LIGHT = np.array([1.00, 0.93, 0.66])
STEEL_DARK = np.array([0.20, 0.21, 0.23])
STEEL_MID = np.array([0.64, 0.66, 0.69])
STEEL_LIGHT = np.array([0.97, 0.97, 0.98])


def gold_ramp(lum: np.ndarray) -> np.ndarray:
    """Map luminance 0..1 to a dark-gold -> gold -> pale-gold ramp, keeping the engraving detail."""
    l = np.clip(lum * 1.6 + 0.08, 0, 1)[..., None]  # the source armor is near-black: lift it
    low = GOLD_DARK + (GOLD_MID - GOLD_DARK) * np.clip(l / 0.6, 0, 1)
    high = GOLD_MID + (GOLD_LIGHT - GOLD_MID) * np.clip((l - 0.6) / 0.4, 0, 1)
    return np.where(l < 0.6, low, high)


def steel_ramp(lum: np.ndarray) -> np.ndarray:
    """Map luminance 0..1 to a dark-steel -> steel -> bright-silver ramp (low saturation)."""
    l = np.clip(lum * 1.3 + 0.15, 0, 1)[..., None]
    low = STEEL_DARK + (STEEL_MID - STEEL_DARK) * np.clip(l / 0.6, 0, 1)
    high = STEEL_MID + (STEEL_LIGHT - STEEL_MID) * np.clip((l - 0.6) / 0.4, 0, 1)
    return np.where(l < 0.6, low, high)


def main(bc_in: str, mr_in: str, bc_out: str, mr_out: str, sword_in: str | None = None) -> None:
    bc = np.asarray(Image.open(bc_in).convert('RGB')).astype(np.float32) / 255
    mr = np.asarray(Image.open(mr_in).convert('RGB')).astype(np.float32) / 255
    metal = np.clip((mr[..., 2] - 0.25) / 0.35, 0, 1)[..., None]  # soft mask from the metallic channel
    lum = bc @ np.array([0.2126, 0.7152, 0.0722])
    gold = gold_ramp(lum)
    out = bc * (1 - metal) + gold * metal
    rough = mr[..., 1] * (1 - 0.35 * metal[..., 0])
    metallic = np.clip(mr[..., 2] + 0.25 * metal[..., 0], 0, 1)
    if sword_in:
        sw = np.asarray(Image.open(sword_in).convert('RGB')).astype(np.float32) / 255
        blade, fuller, hilt = sw[..., 0:1], sw[..., 1:2], sw[..., 2:3]
        # Blade: all steel (whatever the metallic map says), with the gold strip down the middle.
        blade_col = steel_ramp(lum) * (1 - fuller) + gold * fuller
        out = out * (1 - blade) + blade_col * blade
        # Guard, grip and pommel: gold on every part that is at least a little metallic.
        hilt_metal = hilt * np.clip(metal * 2, 0, 1)
        out = out * (1 - hilt_metal) + gold * hilt_metal
        rough = rough * (1 - blade[..., 0]) + mr[..., 1] * 0.5 * blade[..., 0]
        metallic = np.maximum(metallic, blade[..., 0])
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(bc_out, quality=92)
    # Polished metal: a bit more metallic and less rough on metal parts.
    mr2 = mr.copy()
    mr2[..., 1] = rough
    mr2[..., 2] = metallic
    Image.fromarray((np.clip(mr2, 0, 1) * 255).astype(np.uint8)).save(mr_out)


if __name__ == '__main__':
    main(*sys.argv[1:6])
