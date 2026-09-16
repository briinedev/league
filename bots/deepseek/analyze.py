#!/usr/bin/env python3
"""Analyze Briine replays for the DeepSeek bot (bots/deepseek) using decoded events."""
import json
import glob
from collections import defaultdict

def build_id_map(replay):
    """Map compact log ID (1..6) -> (side, name)."""
    m = {}
    for i, name in enumerate(replay['north_characters']):
        m[i + 1] = ('north', name)
    for i, name in enumerate(replay['south_characters']):
        m[i + 4] = ('south', name)
    return m

def parse_raw_log(replay, idmap):
    """Parse the pipe-delimited raw log into structured action events."""
    # CHAR:a:ATTACK:TARGETS -> attack
    # CHAR:s:SPELL:TARGETS   -> spell
    # CHAR:d                  -> defend
    # CHAR:d:AMOUNT:SOURCE    -> damage (different: starts with target char)
    # k:g/k:s:ELEM:AMOUNT     -> stack
    # m:g/m:s:CHAR:AMOUNT     -> stamina
    # e:a/e:e:CHAR:EFFECT     -> effect
    tokens = replay['log'].split('|')
    actions = []   # (source_id, kind, ability)
    damages = []   # (target_id, source_id, amount)
    for tok in tokens:
        if not tok:
            continue
        f = tok.split(':')
        if len(f) < 2:
            continue
        tag = f[0]
        # Defend: CHAR:d
        if tag not in ('m', 'k', 'e', 'st', 'gs') and len(f) == 2 and f[1] == 'd':
            if f[0].isdigit():
                actions.append((int(f[0]), 'defend', None))
            continue
        # Attack: CHAR:a:ABILITY:TARGETS
        if len(f) >= 4 and f[1] == 'a':
            if f[0].isdigit():
                actions.append((int(f[0]), 'attack', f[2]))
            continue
        # Spell: CHAR:s:ABILITY:TARGETS
        if len(f) >= 4 and f[1] == 's':
            if f[0].isdigit():
                actions.append((int(f[0]), 'spell', f[2]))
            continue
        # Damage: TARGET:d:AMOUNT:SOURCE
        if len(f) >= 4 and f[1] == 'd':
            t = f[0]
            if t.isdigit() and f[3].isdigit():
                try:
                    damages.append((int(t), int(f[3]), int(f[2])))
                except Exception:
                    pass
    return actions, damages

def load_all_replays():
    replays = []
    for path in sorted(glob.glob('/tmp/deepseek_replays_p*.json')):
        try:
            data = json.load(open(path))
            replays.extend(data.get('replays', []))
        except Exception:
            pass
    return replays

def analyze(replay):
    side = replay['agent_side']
    idmap = build_id_map(replay)
    bot = set(i for i, (s, _) in idmap.items() if s == side)
    won = (bool(replay['nwin']) and side == 'north') or (not replay['nwin'] and side == 'south')

    actions, damages = parse_raw_log(replay, idmap)

    by_source = defaultdict(lambda: {'attack': 0, 'spell': 0, 'defend': 0, 'dmg_dealt': 0, 'dmg_taken': 0})
    ability_usage = defaultdict(int)
    # damage dealt per ability (for bots)
    ability_dmg = defaultdict(int)

    for src, kind, ability in actions:
        is_bot = src in bot
        by_source[src][kind] += 1
        if ability:
            ability_usage[(is_bot, kind, ability)] += 1

    for target, src, amount in damages:
        if src in by_source:
            by_source[src]['dmg_dealt'] += amount
            # attribute to ability if we can (heuristic via last action of src)
        if target in by_source:
            by_source[target]['dmg_taken'] += amount

    return {
        'id': replay['id'][:12],
        'side': side,
        'won': won,
        'bot_chars': [idmap[i][1] for i in sorted(bot)],
        'enemy_chars': [idmap[i][1] for i in sorted(idmap) if i not in bot],
        'by_source': {idmap[i][1]: by_source[i] for i in sorted(by_source)},
        'ability_usage': {k: v for k, v in ability_usage.items() if k[0]},
        'length': replay.get('length'),
    }

def main():
    replays = load_all_replays()
    print(f'Total replays: {len(replays)}\n')
    win = 0
    all_usage = defaultdict(int)
    for r in replays:
        a = analyze(r)
        if a['won']:
            win += 1
        status = 'WIN ' if a['won'] else 'LOSS'
        print(f"--- {a['id']} [{status}] side={a['side']} length={a['length']}")
        print(f"    bot   : {a['bot_chars']}")
        print(f"    enemy : {a['enemy_chars']}")
        for name, s in a['by_source'].items():
            print(f"      {name:<10} att:{s['attack']} spell:{s['spell']} def:{s['defend']} dmgDealt:{s['dmg_dealt']} dmgTaken:{s['dmg_taken']}")
        for (is_bot, kind, ability), cnt in a['ability_usage'].items():
            all_usage[(kind, ability)] += cnt
            print(f"      [bot] {kind} {ability}: {cnt}")
    print(f"\n=== Record: {win}W / {len(replays)-win}L ===")
    print("\n=== Bot ability usage (all matches) ===")
    for (kind, ability), cnt in sorted(all_usage.items(), key=lambda x: -x[1]):
        print(f"  {kind:6s} {ability:<24} {cnt}")

if __name__ == '__main__':
    main()
