import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {jpegUpload} from '../src/media.js';
describe('bounded public JPEG assets',()=>{
 const photo=readFileSync(new URL('../../public/produtos/pneus/pneu-01.jpg',import.meta.url));
 it('accepts existing JPEG and derives an immutable content address',()=>{const first=jpegUpload(photo.toString('base64'));expect(first.id).toHaveLength(64);expect(jpegUpload(photo.toString('base64')).id).toBe(first.id);expect(Buffer.from(first.content).equals(photo)).toBe(true);});
 it('rejects other files, incomplete JPEGs and excessive payloads',()=>{for(const value of ['<script>','PHN2Zy8+',photo.subarray(0,40).toString('base64'),Buffer.alloc(524289).toString('base64')])expect(()=>jpegUpload(value)).toThrow();});
});
