import { describe, it, expect } from 'vitest';
import { validateUser, validateUpdateBody, validateAuthBody, validateUrl } from '../validation.js';

describe('validateUser', () => {
    it('accepts a valid user object', () => {
        const { error } = validateUser({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'secret',
        });
        expect(error).toBeUndefined();
    });

    it('rejects when name is missing', () => {
        const { error } = validateUser({
            name: '',
            email: 'alice@example.com',
            password: 'secret',
        });
        expect(error).toBeDefined();
    });

    it('rejects when name is too short (< 5 chars)', () => {
        const { error } = validateUser({
            name: 'Ali',
            email: 'alice@example.com',
            password: 'secret',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toMatch(/name/);
    });

    it('rejects when name exceeds 50 chars', () => {
        const { error } = validateUser({
            name: 'A'.repeat(51),
            email: 'alice@example.com',
            password: 'secret',
        });
        expect(error).toBeDefined();
    });

    it('accepts name at exactly 5 chars', () => {
        const { error } = validateUser({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'secret',
        });
        expect(error).toBeUndefined();
    });

    it('accepts name at exactly 50 chars', () => {
        const { error } = validateUser({
            name: 'A'.repeat(50),
            email: 'alice@example.com',
            password: 'secret',
        });
        expect(error).toBeUndefined();
    });

    it('rejects an invalid email format', () => {
        const { error } = validateUser({
            name: 'Alice',
            email: 'not-an-email',
            password: 'secret',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toMatch(/email/);
    });

    it('rejects when email is missing', () => {
        const { error } = validateUser({ name: 'Alice', email: '', password: 'secret' });
        expect(error).toBeDefined();
    });

    it('rejects when password is too short (< 5 chars)', () => {
        const { error } = validateUser({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'abc',
        });
        expect(error).toBeDefined();
        expect(error!.details[0].message).toMatch(/password/);
    });

    it('rejects when password exceeds 1024 chars', () => {
        const { error } = validateUser({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'a'.repeat(1025),
        });
        expect(error).toBeDefined();
    });

    it('accepts password at exactly 5 chars', () => {
        const { error } = validateUser({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'abcde',
        });
        expect(error).toBeUndefined();
    });

    it('rejects unknown extra fields', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = validateUser({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'secret',
            extra: 'bad',
        } as any);
        expect(error).toBeDefined();
    });
});

describe('validateUpdateBody', () => {
    it('accepts an object with just name', () => {
        const { error } = validateUpdateBody({ name: 'Alice Updated' });
        expect(error).toBeUndefined();
    });

    it('accepts an object with just email', () => {
        const { error } = validateUpdateBody({ email: 'new@example.com' });
        expect(error).toBeUndefined();
    });

    it('accepts an object with just password', () => {
        const { error } = validateUpdateBody({ password: 'newpassword' });
        expect(error).toBeUndefined();
    });

    it('accepts an object with all three fields', () => {
        const { error } = validateUpdateBody({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'newpass',
        });
        expect(error).toBeUndefined();
    });

    it('rejects an empty object (at least one field required)', () => {
        const { error } = validateUpdateBody({});
        expect(error).toBeDefined();
    });

    it('rejects when name is too short', () => {
        const { error } = validateUpdateBody({ name: 'Bob' });
        expect(error).toBeDefined();
    });

    it('rejects an invalid email', () => {
        const { error } = validateUpdateBody({ email: 'not-an-email' });
        expect(error).toBeDefined();
    });

    it('rejects when password is too short', () => {
        const { error } = validateUpdateBody({ password: 'abc' });
        expect(error).toBeDefined();
    });
});

describe('validateAuthBody', () => {
    it('accepts valid email and password', () => {
        const { error } = validateAuthBody({ email: 'alice@example.com', password: 'secret' });
        expect(error).toBeUndefined();
    });

    it('rejects missing email', () => {
        const { error } = validateAuthBody({ email: '', password: 'secret' });
        expect(error).toBeDefined();
    });

    it('rejects invalid email format', () => {
        const { error } = validateAuthBody({ email: 'bad-email', password: 'secret' });
        expect(error).toBeDefined();
    });

    it('rejects missing password', () => {
        const { error } = validateAuthBody({ email: 'alice@example.com', password: '' });
        expect(error).toBeDefined();
    });

    it('rejects password that is too short', () => {
        const { error } = validateAuthBody({ email: 'alice@example.com', password: 'ab' });
        expect(error).toBeDefined();
    });
});

describe('validateUrl', () => {
    it('accepts a valid http URL', () => {
        const { error } = validateUrl({ url: 'http://example.com' });
        expect(error).toBeUndefined();
    });

    it('accepts a valid https URL', () => {
        const { error } = validateUrl({ url: 'https://example.com/path?query=1' });
        expect(error).toBeUndefined();
    });

    it('rejects a non-URI string', () => {
        const { error } = validateUrl({ url: 'not a url' });
        expect(error).toBeDefined();
    });

    it('rejects an empty string', () => {
        const { error } = validateUrl({ url: '' });
        expect(error).toBeDefined();
    });

    it('rejects a missing url field', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = validateUrl({} as any);
        expect(error).toBeDefined();
    });
});
