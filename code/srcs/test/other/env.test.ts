import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from "../../backend/utils/logger";

updateENV("debug");

const location = "Teste de User Repository";



describe('Env', () => {
  it('NOT null', () => {
    // Logger.debug(location, "va env:", process.env);
    const all_env =  process.env;
    expect(all_env.JWT_TOKEN).toBeDefined();
    expect(all_env.JWT_TOKEN_REFRESH).toBeDefined();
    // testé autre varieble denvironement present
  });
});
