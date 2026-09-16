import GptOssAgent from '../index';

describe('GptOssAgent basic behavior', () => {
    const agent = new GptOssAgent();

    test('chooseCharacter returns first available', () => {
        const dummy = [{ id: 'c1' } as any];
        expect(agent.chooseCharacter(dummy as any, [] as any, [] as any)).toBe(dummy[0]);
    });

    test('chooseSpells returns a prefix of spells', () => {
        const spells = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}` } as any));
        const result = agent.chooseSpells(spells as any, [] as any, [] as any);
        expect(result.length).toBeLessThanOrEqual(5);
        expect(result[0]).toBe(spells[0]);
    });
});
