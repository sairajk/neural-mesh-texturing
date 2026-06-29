# Contributing Papers and Corrections

Thank you for helping us keep the *Neural 3D Mesh Texturing* paper list accurate and up-to-date.

The easiest way to suggest a change is to open a GitHub issue through the following forms:

- [Submit a missing paper](https://github.com/sairajk/neural-mesh-texturing/issues/new?template=paper_submission.yml)
- [Correct an existing entry](https://github.com/sairajk/neural-mesh-texturing/issues/new?template=correction.yml)

You do not need to edit `data/papers.json` yourself. Maintainers will review submissions, normalize taxonomy labels, update the website data, and close the issue once the change is handled.

## Paper Entry Format

The website data lives in `data/papers.json`. Each entry follows this general structure:

```json
{
  "id": "2026-short-paper-name",
  "title": "Paper Title",
  "authors": [
    "First Author",
    "Second Author"
  ],
  "venue": "SIGGRAPH Asia",
  "year": 2026,
  "model": "Diffusion (2D)",
  "guidance": [
    "Text"
  ],
  "model_type": "Pre-trained",
  "generation_strategy": "Iterative",
  "texture_type": [
    "RGB Tex."
  ],
  "tags": [
    "text-guided",
    "uv texture"
  ],
  "links": {
    "paper": "https://...",
    "project": "https://...",
    "code": "https://..."
  }
}
```

Some taxonomy fields can contain either a single value or multiple values. When in doubt, list all relevant values in the issue form and add a short note for maintainers.

## Taxonomy Fields

- **Model Type**: the neural model or backbone used, such as `Diffusion (2D)`, `GAN`, `Neural Fields`, `VAE`, or `CLIP`.
- **Guidance**: the input condition controlling texture appearance, such as `Text`, `Image`, `3D Mesh`, `3D Shape`, `Brush`, `Multimodal`, or `Unconditional`.
- **Training Strategy**: whether the model is `Pre-trained`, `Fine-tuned`, or `Custom`.
- **Generation Strategy**: how textures are generated, such as `Optimization`, `Iterative`, `Synchronized`, or `Feed-forward`.
- **Texture Type**: the output texture/material type, such as `RGB Tex.` or `PBR Mat.`.

Parenthetical text is used for additional detail in the table. For example, `Diffusion (2D)` and `Diffusion (UV)` both appear under the broader `Diffusion` filter on the website.

## Review Process

Maintainers may adjust wording, tags, links, or taxonomy labels so entries remain consistent across the list. Please include official paper links and source evidence whenever possible, especially for taxonomy corrections.
