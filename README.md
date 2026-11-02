# QuantumMed

Static site (HTML, CSS, vanilla JS) for the project *Exploring Quantum Computing for Drug Discovery*. No build step, no backend.

## Test locally
```bash
python -m http.server 8000   # then open http://localhost:8000
```
Use a local server (not `file://`) so `data/results.json` can load.

## Deploy to GitHub Pages
1. Put `index.html`, `style.css`, `script.js`, `README.md` in the repo root.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Open `https://<user>.github.io/<repo>/`.

## Pages
`#home`, `#water`, `#input`, `#output`, `#method` (hash routing, single `index.html`).

## Adding real data later
- **Input page**: files added in the browser are viewed locally and never saved or uploaded.
- **Output page**: shows only what is in `data/results.json`. Without that file it shows a placeholder. All fields are optional; missing ones are not displayed.

```json
{
  "molecule": "", "method": "", "ansatz": "", "optimizer": "", "backend": "",
  "electronic_energy": 0, "nuclear_repulsion": 0, "total_energy": 0, "evaluations": 0,
  "history": [0],
  "references": [{ "name": "", "value": 0, "source": "" }],
  "analysis": ""
}
```
`history` is the per-evaluation energy list; the convergence graph is drawn only if it is provided. Fill every value from teammates' verified outputs.

## Water geometry
The 3D model uses the `GEOM` constant at the top of `script.js` (display geometry). Replace it with the geometry used for the Hamiltonian.
