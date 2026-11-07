# Embedded institutional report fonts

These files are self-hosted and embedded into generated PDFs. Report font choices do not change the surrounding application interface.

| Setting | Embedded family | Files |
| --- | --- | --- |
| `jakarta` | Plus Jakarta Sans | Regular (400), Bold (700) |
| `arial` | Liberation Sans, an Arial-compatible family | Regular, Bold |
| `times-new-roman` | Liberation Serif, a Times New Roman-compatible family | Regular, Bold |
| `noto-sans` | Noto Sans | Regular, Bold |
| `noto-serif` | Noto Serif | Regular, Bold |

The Microsoft typefaces themselves are not bundled. The selector explicitly identifies the compatible families. See the [Liberation Fonts project](https://github.com/liberationfonts/liberation-fonts) for compatibility and source information.

Liberation files are unmodified Liberation Fonts 2.1.5 from the local `ttf-liberation` distribution. Plus Jakarta Sans files are static instances of the existing `../jakarta/PlusJakartaSans-VariableFont_wght.ttf`, generated with fontTools 4.68.0 at `wght=400` and `wght=700` with `updateFontNames=True`. Font conversion is an asset preparation step, not a runtime or build dependency.

Both families are distributed under the SIL Open Font License. The original license/copyright notices are included in `OFL-Liberation.txt` and `OFL-PlusJakartaSans.txt`. The Jakarta notice comes from the [Google Fonts source](https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt).

Noto Sans and Noto Serif come from the local `noto-fonts` distribution. Its Apache 2.0 license is included in `LICENSE-Noto.txt`.
