#!/usr/bin/env python3
"""Analyze Briine replays for the Kimi bot (production v0.0.2).

Uses decoded events from /replays/:username/:agentName/:version.
Run from bots/kimi after saving replays to data/replays-VERSION.json.
"""

import json
import sys
from collections import defaultdict

VERSION = sys.argv[1] if len(sys.argv) > 1 else "0.0.2"
PATH = f"data/replays-{VERSION}.json"


def load():
    with open(PATH) as f:
        return json.load(f)


def our_ids(r):
    return [1, 2, 3] if r["agent_side"] == "north" else [4, 5, 6]


def opp_ids(r):
    return [4, 5, 6] if r["agent_side"] == "north" else [1, 2, 3]


def won(r):
    # nwin is 1 if north won. Our side wins when our side is north and nwin is 1,
    # or our side is south and nwin is 0.
    if r["agent_side"] == "north":
        return r.get("nwin") == 1
    return r.get("nwin") == 0


def analyze(r):
    ours = our_ids(r)
    opp = opp_ids(r)
    actions = {"a": 0, "s": 0, "d": 0}
    opp_actions = {"a": 0, "s": 0, "d": 0}
    our_spell_casts = defaultdict(int)
    our_spell_dmg = defaultdict(int)
    opp_spell_casts = defaultdict(int)
    opp_spell_dmg = defaultdict(int)
    our_atk_hits = defaultdict(int)
    our_atk_dmg = defaultdict(int)
    opp_atk_hits = defaultdict(int)
    opp_atk_dmg = defaultdict(int)
    our_dmg_taken = 0
    opp_dmg_taken = 0
    our_heal = 0
    opp_heal = 0
    attacks_on_lowest = 0
    total_attacks = 0
    focus_counts = defaultdict(int)

    events = r["events"]
    for i, e in enumerate(events):
        t = e["type"]
        ch = e.get("character", "0")
        if not ch.isdigit():
            continue
        cid = int(ch)
        if t == "attack":
            if cid in ours:
                actions["a"] += 1
                total_attacks += 1
                target = e["targets"][0]
                focus_counts[int(target)] += 1
                our_atk_hits[e["ability"]] += 1
            elif cid in opp:
                opp_actions["a"] += 1
                opp_atk_hits[e["ability"]] += 1
        elif t == "spell":
            # Avoid interpreting engine stamina/stack tokens as spells.
            if e["character"] in ("k", "m", "e"):
                continue
            if cid in ours:
                actions["s"] += 1
                our_spell_casts[e["ability"]] += 1
            elif cid in opp:
                opp_actions["s"] += 1
                opp_spell_casts[e["ability"]] += 1
        elif t == "defend":
            if cid in ours:
                actions["d"] += 1
            elif cid in opp:
                opp_actions["d"] += 1
        elif t == "damage":
            amt = e["amount"]
            tid = int(e["character"])
            if amt > 0:
                if tid in opp:
                    opp_dmg_taken += amt
                elif tid in ours:
                    our_dmg_taken += amt
            else:
                if tid in ours:
                    our_heal += -amt
                elif tid in opp:
                    opp_heal += -amt

    # Sum damage that followed each attack/spell ability by looking forward.
    for i, e in enumerate(events):
        t = e["type"]
        ch = e.get("character", "0")
        if not ch.isdigit():
            continue
        cid = int(ch)
        if t not in ("attack", "spell"):
            continue
        ability = e["ability"]
        dmg = 0
        for j in range(i + 1, min(i + 25, len(events))):
            nxt = events[j]
            if nxt["type"] == "attack" or (
                nxt["type"] == "spell" and nxt["character"] not in ("k", "m", "e")
            ):
                break
            if nxt["type"] == "damage":
                amt = nxt["amount"]
                tid = int(nxt["character"])
                if cid in ours and tid in opp and amt > 0:
                    dmg += amt
                elif cid in opp and tid in ours and amt > 0:
                    dmg += amt
        if cid in ours:
            if t == "attack":
                our_atk_dmg[ability] += dmg
            else:
                our_spell_dmg[ability] += dmg
        elif cid in opp:
            if t == "attack":
                opp_atk_dmg[ability] += dmg
            else:
                opp_spell_dmg[ability] += dmg

    lowest_opp = min(opp)
    focus_pct = round(focus_counts[lowest_opp] * 100 / total_attacks, 1) if total_attacks else 0

    return {
        "id": r["id"][:16],
        "won": won(r),
        "length": r["length"],
        "our_actions": dict(actions),
        "opp_actions": dict(opp_actions),
        "our_dmg": opp_dmg_taken,
        "opp_dmg": our_dmg_taken,
        "our_heal": our_heal,
        "opp_heal": opp_heal,
        "our_spells": {k: {"casts": v, "dmg": our_spell_dmg[k]} for k, v in our_spell_casts.items()},
        "our_attacks": {k: {"hits": v, "dmg": our_atk_dmg[k]} for k, v in our_atk_hits.items()},
        "opp_spells": {k: {"casts": v, "dmg": opp_spell_dmg[k]} for k, v in opp_spell_casts.items()},
        "opp_attacks": {k: {"hits": v, "dmg": opp_atk_dmg[k]} for k, v in opp_atk_hits.items()},
        "focus_pct": focus_pct,
        "focus_counts": dict(focus_counts),
        "our_chars": r[f"{r['agent_side']}_characters"],
        "our_sp": r[f"{r['agent_side']}_spellpool"],
        "opp_chars": r["south_characters" if r["agent_side"] == "north" else "north_characters"],
        "opp_sp": r["south_spellpool" if r["agent_side"] == "north" else "north_spellpool"],
        "stack": stack_metrics(r),
    }


def print_summary(rec):
    print("\n---", rec["id"], "won", rec["won"], "len", rec["length"])
    print("our actions", rec["our_actions"], "opp", rec["opp_actions"])
    print("damage dealt", rec["our_dmg"], "taken", rec["opp_dmg"], "heal", rec["our_heal"], "opp heal", rec["opp_heal"])
    print("focus%", rec["focus_pct"], "focus counts", rec["focus_counts"])
    print("our chars", rec["our_chars"], "sp", rec["our_sp"])
    print("our spells", rec["our_spells"])
    print("our attacks", rec["our_attacks"])
    print("opp chars", rec["opp_chars"], "sp", rec["opp_sp"])
    print("opp spells", rec["opp_spells"])
    print("opp attacks", rec["opp_attacks"])


def stack_metrics(r):
    ours = our_ids(r)
    opp = opp_ids(r)
    our_gain = defaultdict(int)
    opp_gain = defaultdict(int)
    spent = defaultdict(int)
    max_total = 0
    current = defaultdict(int)
    for t in r["log"].split("|"):
        if not t.startswith("k:"):
            continue
        parts = t.split(":")
        op = parts[1]
        el = parts[2]
        amt = int(parts[3])
        src = parts[4] if len(parts) > 4 else ""
        if op == "g":
            current[el] += amt
            if src.isdigit():
                if int(src) in ours:
                    our_gain[el] += amt
                elif int(src) in opp:
                    opp_gain[el] += amt
        elif op == "s":
            current[el] -= amt
            spent[el] += amt
        max_total = max(max_total, sum(current.values()))
    return {
        "our_gain": dict(our_gain),
        "opp_gain": dict(opp_gain),
        "spent": dict(spent),
        "max_total": max_total,
    }


def aggregate(records):
    wins = sum(1 for r in records if r["won"])
    total = len(records)
    print("\n=== AGGREGATE", wins, "/", total, "wins ===")
    agg = defaultdict(lambda: {"casts": 0, "dmg": 0})
    for r in records:
        for k, v in r["our_spells"].items():
            agg[k]["casts"] += v["casts"]
            agg[k]["dmg"] += v["dmg"]
    print("our spells")
    for k, v in sorted(agg.items(), key=lambda x: -x[1]["dmg"]):
        avg = round(v["dmg"] / v["casts"], 1) if v["casts"] else 0
        print(" ", k, "casts", v["casts"], "dmg", v["dmg"], "avg", avg)
    atk = defaultdict(lambda: {"hits": 0, "dmg": 0})
    for r in records:
        for k, v in r["our_attacks"].items():
            atk[k]["hits"] += v["hits"]
            atk[k]["dmg"] += v["dmg"]
    print("our attacks")
    for k, v in sorted(atk.items(), key=lambda x: -x[1]["dmg"]):
        avg = round(v["dmg"] / v["hits"], 1) if v["hits"] else 0
        print(" ", k, "hits", v["hits"], "dmg", v["dmg"], "avg", avg)
    our_a = sum(r["our_actions"]["a"] for r in records)
    our_s = sum(r["our_actions"]["s"] for r in records)
    our_d = sum(r["our_actions"]["d"] for r in records)
    opp_a = sum(r["opp_actions"]["a"] for r in records)
    opp_s = sum(r["opp_actions"]["s"] for r in records)
    opp_d = sum(r["opp_actions"]["d"] for r in records)
    print("our action totals a/s/d", our_a, our_s, our_d)
    print("opp action totals a/s/d", opp_a, opp_s, opp_d)

    print("\nstack summary")
    total_our_gain = sum(sum(m["our_gain"].values()) for m in (r["stack"] for r in records))
    total_opp_gain = sum(sum(m["opp_gain"].values()) for m in (r["stack"] for r in records))
    total_spent = sum(sum(m["spent"].values()) for m in (r["stack"] for r in records))
    print("  our gain", total_our_gain, "opp gain", total_opp_gain, "spent", total_spent)
    print("  max total stack", max(r["stack"]["max_total"] for r in records))


def load_characters():
    try:
        with open("data/characters.json") as f:
            return json.load(f).get("characters", [])
    except FileNotFoundError:
        return []


def attack_element_profile(r, characters_catalog):
    """Return a Counter of attack elements generated by our team."""
    ours = our_ids(r)
    side = r.get("agent_side", "north")
    ours_chars = r.get(f"{side}_characters", [])
    # Build a map from slot index (1-based) to character id.
    slot_char = {}
    for i, char_id in enumerate(ours_chars, start=1):
        slot_char[i] = char_id
    char_attacks = {
        c["id"]: [
            (a.get("element", {}).get("id") if isinstance(a.get("element"), dict) else a.get("element"))
            for a in c.get("attacks", [])
        ]
        for c in characters_catalog
    }
    profile = defaultdict(int)
    for cid in ours:
        char_id = slot_char.get(cid)
        if char_id:
            for el in char_attacks.get(char_id, []):
                if el:
                    profile[el] += 1
    return profile


def spell_element_profile(spell_ids, spells_catalog):
    profile = defaultdict(int)
    for sid in spell_ids:
        s = next((x for x in spells_catalog if x["id"] == sid), {})
        el = s.get("element", {}).get("id") if isinstance(s.get("element"), dict) else s.get("element")
        if el:
            profile[el] += 1
    return profile


def analyze_spell_pool_alignment(raw_replays, records, spells_catalog, characters_catalog):
    print("\n=== spell pool element alignment (our team attacks vs chosen spells) ===")
    for raw, rec in zip(raw_replays, records):
        atk_prof = attack_element_profile(raw, characters_catalog)
        sp_prof = spell_element_profile(rec["our_sp"], spells_catalog)
        print("match", rec["id"])
        print("  our chars", rec["our_chars"])
        print("  attack elements", dict(atk_prof))
        print("  spell elements", dict(sp_prof))


def main():
    data = load()
    raw_replays = data["replays"]
    records = [analyze(r) for r in raw_replays]
    for rec in records:
        print_summary(rec)
    aggregate(records)
    spells_catalog = data.get("spells", [])
    if not spells_catalog:
        try:
            with open("data/spells.json") as f:
                spells_catalog = json.load(f).get("spells", [])
        except FileNotFoundError:
            pass
    characters_catalog = load_characters()
    analyze_spell_pool_alignment(raw_replays, records, spells_catalog, characters_catalog)


if __name__ == "__main__":
    main()
