import {describe, expect, test} from "vitest";
import {formatFileNames} from "../../lib/util/file-utils";


describe('formatFileNames', () => {
    test('changes webp file-ending to tif', () => {
        expect(formatFileNames('abc.webp')).toBe('abc.tif')
    })

    test('does not change jpg ending', () => {
        expect(formatFileNames('abc.jpg')).toBe('abc.jpg')
    })

    test('returns empty string for no or empty value', () => {
        expect(formatFileNames(undefined)).toBe('')
        expect(formatFileNames('')).toBe('')
    })

    test('returns string as-is if no ending', () => {
        expect(formatFileNames('hei')).toBe('hei')
    })
})
