import assert from 'node:assert/strict';
import { PasswordService } from '../src/auth/password.service';
assert.equal(await new PasswordService().verify('bad-hash', 'bad-password'), false);
