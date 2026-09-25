"""Offline real-renderer browser check. Requires Linux Xvfb, Chromium and Python Playwright.
Generate preview.html using node scripts/preview.mjs before running.
For native HTTP browser verification, use node tests/browser.mjs in CI instead.
"""
import os,runpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
os.environ.setdefault('ISLAND_HTML',str(root/'preview.html'))
runpy.run_path(str(root/'tests/world_browser_offline.py'),run_name='__main__')
