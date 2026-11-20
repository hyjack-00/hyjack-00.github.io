import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('citations', Path(__file__).parents[1] / 'scripts/update-citations.py')
citations = importlib.util.module_from_spec(spec)
spec.loader.exec_module(citations)
PAPER = {'title': 'Example Study', 'citationWorkIds': ['W1', 'W2']}


def record(work_id, title='Example Study', author='Yujie Huang'):
    return {'id': f'https://openalex.org/{work_id}', 'display_name': title,
            'authorships': [{'author': {'display_name': author}}]}


class CitationTests(unittest.TestCase):
    def test_versions_and_pages_are_deduplicated(self):
        def fetch(url):
            if '/works/W' in url:
                return record(url.rsplit('/', 1)[-1])
            self.assertIn('W1%7CW2', url)
            if 'cursor=next' in url:
                return {'meta': {'count': 2, 'next_cursor': None}, 'results': [{'id': 'https://openalex.org/W4'}]}
            return {'meta': {'count': 2, 'next_cursor': 'next'}, 'results': [{'id': 'https://openalex.org/W3'}, {'id': 'https://openalex.org/W3'}]}
        self.assertEqual(citations.count_paper(PAPER, fetch)['count'], 2)

    def test_wrong_author_or_title_is_rejected(self):
        for work in [record('W1', author='Another Huang'), record('W1', title='Unrelated Study')]:
            with self.assertRaises(ValueError):
                citations.count_paper(PAPER, lambda url: work)

    def test_zero_requires_complete_successful_response(self):
        def fetch(url):
            if '/works/W' in url:
                return record('W1')
            return {'meta': {'count': 0, 'next_cursor': None}, 'results': []}
        self.assertEqual(citations.count_paper(PAPER, fetch)['count'], 0)
        with self.assertRaises(ValueError):
            citations.count_paper(PAPER, lambda url: record('W1') if '/works/W' in url else {'results': []})

    def test_partial_results_are_rejected(self):
        def fetch(url):
            if '/works/W' in url:
                return record('W1')
            return {'meta': {'count': 2, 'next_cursor': None}, 'results': [{'id': 'https://openalex.org/W3'}]}
        with self.assertRaises(ValueError):
            citations.count_paper(PAPER, fetch)

    def test_failure_keeps_previous_count_and_timestamp(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parents[1]) as directory:
            path = Path(directory) / 'content.json'
            original = json.dumps({'publications': [PAPER], 'citationStats': {'count': 9, 'updatedAt': 'previous'}})
            path.write_text(original)
            def unavailable(url):
                raise OSError('API unavailable')
            with self.assertRaises(OSError):
                citations.refresh(path, unavailable)
            self.assertEqual(path.read_text(), original)


if __name__ == '__main__':
    unittest.main()
