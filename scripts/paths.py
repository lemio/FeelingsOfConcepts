"""Shared paths for the data pipeline. Importing this module also switches the working
directory to data/work/, where every intermediate file lives."""
import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE = os.path.join(REPO, 'data', 'source')      # saved Slack archive pages (input)
WORK = os.path.join(REPO, 'data', 'work')          # curated + intermediate files
TMP = os.path.join(WORK, 'tmp')                    # throwaway files (git-ignored)
PUBLIC = os.path.join(REPO, 'public')              # what the website serves
DATASET = os.path.join(PUBLIC, 'data', 'projects.json')
IMAGES = os.path.join(PUBLIC, 'images')

os.makedirs(os.path.join(TMP, 'readme_html'), exist_ok=True)
os.chdir(WORK)
