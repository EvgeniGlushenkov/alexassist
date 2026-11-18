"""Check the static ABR catalogue against its JSON source."""
import csv
import json
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ABR = Path(__file__).resolve().parents[1] / "abr"
FIELDS = ("country", "sector", "model", "task", "evidence_level")


class Catalogue(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.options = {}
        self.select = None
        self.option = None
        self.ids = set()
        self.duplicate_ids = set()
        self.classes = set()
        self.data_evidence = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        self.classes.update(classes)
        self.data_evidence |= "data-evidence" in attrs
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.duplicate_ids.add(attrs["id"])
            self.ids.add(attrs["id"])
        if tag == "details" and "analogue" in classes:
            self.cards.append((int(attrs["id"].removeprefix("analogue-")), attrs))
        elif tag == "select":
            self.select = attrs.get("id")
            if self.select:
                self.options[self.select] = {}
        elif tag == "option" and self.select:
            self.option = attrs["value"]
            self.options[self.select][self.option] = ""

    def handle_data(self, data):
        if self.select and self.option:
            self.options[self.select][self.option] += data

    def handle_endtag(self, tag):
        if tag == "option":
            self.option = None
        elif tag == "select":
            self.select = None


def main():
    rows = json.loads((ABR / "assets/benchmarks.json").read_text())
    expected = {row["id"]: row for row in rows}
    with (ABR / "assets/benchmarks.csv").open(encoding="utf-8-sig", newline="") as source:
        export = list(csv.DictReader(source, delimiter=";"))
    parser = Catalogue()
    parser.feed((ABR / "index.html").read_text())
    assert len(rows) == len(expected) == len(export) == len(parser.cards)
    assert set(expected) == {number for number, _ in parser.cards}
    assert not parser.duplicate_ids, parser.duplicate_ids
    required = {"filter-status", "renewal-form", "economics-form", "catalog-empty", "reset-catalog"}
    assert required <= parser.ids, required - parser.ids
    assert {"filter", "catalog-tools"} <= parser.classes and parser.data_evidence
    for number, card in parser.cards:
        for field in FIELDS:
            assert card["data-" + field.replace("_", "-")] == expected[number][field], (number, field)
    for row, entry in zip(rows, export):
        assert entry == {key: str(row.get(key, "")) for key in entry}
        assert row.keys() <= entry.keys()
    for field in ("country", "sector", "model", "task"):
        counts = Counter(row[field] for row in rows)
        options = parser.options[field + "-filter"]
        assert set(options) == {"all", *counts}, field
        for value, count in counts.items():
            assert options[value].rstrip().endswith(f" · {count}"), (field, value, options[value])
    print(f"Catalogue OK: {len(rows)} projects, JSON, HTML, CSV and filters agree.")


if __name__ == "__main__":
    main()
