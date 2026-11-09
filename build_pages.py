from pathlib import Path
from shutil import copytree

from flask import render_template

from app import app


ROOT = Path(__file__).resolve().parent


def static_url(endpoint, filename):
    if endpoint != "static":
        raise ValueError(f"Unsupported static export endpoint: {endpoint}")
    return f"./static/{filename}"


def build():
    destination = ROOT / "dist"
    if not destination.resolve().is_relative_to(ROOT):
        raise ValueError("The export directory must stay inside the project folder")
    destination.mkdir(exist_ok=True)
    with app.app_context():
        html = render_template("index.html", url_for=static_url)
    (destination / "index.html").write_text(html, encoding="utf-8")
    (destination / ".nojekyll").touch()
    copytree(ROOT / "static", destination / "static", dirs_exist_ok=True)
    print(f"Built GitHub Pages site in {destination}")


if __name__ == "__main__":
    build()
