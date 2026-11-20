#!/usr/bin/env python3
"""Refresh OpenAlex citations for listed papers, deduplicating publication versions."""
import concurrent.futures
import datetime
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

CONTENT = Path(__file__).resolve().parents[1] / 'data/content.json'


def normalize(value):
    return ''.join(c.lower() for c in value if c.isalnum())


def request_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'AcademicHomepageCitationUpdater/1.0'})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)


def count_paper(paper, fetch=request_json):
    seeds = paper.get('citationWorkIds', [])
    if not seeds or any(not re.fullmatch(r'W\d+', value) for value in seeds):
        raise ValueError(f'Missing or invalid OpenAlex mapping: {paper["title"]}')
    titles = {normalize(t) for t in [paper['title'], *paper.get('citationTitleAliases', [])]}
    work_ids = set()
    for seed in seeds:
        work = fetch(f'https://api.openalex.org/works/{seed}')
        authors = [normalize(a['author'].get('display_name', '')) for a in work.get('authorships', [])]
        if normalize(work.get('display_name', '')) not in titles or 'yujiehuang' not in authors:
            raise ValueError(f'OpenAlex identity mismatch: {paper["title"]}/{seed}')
        resolved = work.get('id', '').removeprefix('https://openalex.org/')
        if not re.fullmatch(r'W\d+', resolved):
            raise ValueError('Invalid resolved OpenAlex work ID')
        work_ids.add(resolved)
    query = {'filter': 'referenced_works:' + '|'.join(sorted(work_ids)), 'select': 'id', 'per-page': 200}
    source = 'https://api.openalex.org/works?' + urllib.parse.urlencode(query)
    citing_ids, cursors = set(), set()
    cursor = '*'
    while cursor:
        if cursor in cursors:
            raise ValueError('Repeated OpenAlex pagination cursor')
        cursors.add(cursor)
        page = fetch(source + '&cursor=' + urllib.parse.quote(cursor, safe=''))
        results = page.get('results')
        if not isinstance(results, list):
            raise ValueError('Missing OpenAlex citation results')
        for citing in results:
            if not re.fullmatch(r'https://openalex.org/W\d+', citing.get('id', '')):
                raise ValueError('Invalid citing work ID')
            citing_ids.add(citing['id'])
        cursor = page.get('meta', {}).get('next_cursor')
        if not results or not cursor:
            expected = page.get('meta', {}).get('count')
            if not isinstance(expected, int) or len(citing_ids) != expected:
                raise ValueError('Incomplete OpenAlex citation results')
            break
    return {'title': paper['title'], 'count': len(citing_ids), 'workIds': sorted(work_ids), 'source': source}


def refresh(path=CONTENT, fetch=request_json):
    original = path.read_text(encoding='utf-8')
    content = json.loads(original)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        papers = list(pool.map(lambda p: count_paper(p, fetch), content['publications']))
    count = sum(p['count'] for p in papers)
    content['citationStats'] = {
        'provider': 'OpenAlex', 'count': count,
        'updatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
        'scope': 'listed-publications', 'method': 'sum-per-paper-deduplicated-versions',
        'papers': papers
    }
    if path.read_text(encoding='utf-8') != original:
        raise RuntimeError('Content changed during fetch; refusing to overwrite it')
    temporary = path.with_suffix('.citations.tmp')
    try:
        temporary.write_text(json.dumps(content, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.chmod(path.stat().st_mode & 0o777)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    return content['citationStats']


if __name__ == '__main__':
    stats = refresh()
    print(f'OpenAlex: {stats["count"]} citations across {len(stats["papers"])} listed papers; {stats["updatedAt"]}')
    for paper in stats['papers']:
        print(f'  {paper["count"]:4}  {paper["title"]}')
