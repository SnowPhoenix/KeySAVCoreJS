import PkBase from "./pkbase";
import * as util from "./util";
import { eggnames } from "./save-breaker";
import SaveReaderEncrypted from "./save-reader-encrypted";

class LegacySaveKey {
    public boxKey1: Uint8Array;
    private _blank: Uint8Array;
    public boxKey2: Uint8Array;
    public slot1Key: Uint8Array;

    private key32: Uint32Array;

    get keyData() {
        return this.key;
    }

    get blank(): Uint8Array {
        return this._blank;
    }

    set blank(val: Uint8Array) {
        util.copy(val, 0, this._blank, 0, 232);
    }

    get stamp(): string {
        return util.getStampSav(this.key, 0);
    }

    get boxOffset(): number {
        return this.key32[0x1C / 4];
    }

    set boxOffset(val: number) {
        this.key32[0x1C / 4] = val;
    }

    get slot1Flag(): number {
        return this.key32[0x80000 / 4];
    }

    set slot1Flag(val: number) {
        this.key32[0x80000 / 4] = val;
    }

    private get magic(): number {
        return this.key32[2];
    }

    private set magic(val: number) {
        this.key32[2] = val;
    }

    public get isNewKey(): boolean {
        return !this.slot1Key.every(e => e == 0);
    }

    public setStamp(save: Uint8Array) {
        util.copy(save, 0x10, this.key, 0x0, 0x8);
    }



    constructor(private key: Uint8Array) {
        this.key32 = new Uint32Array(key.buffer, key.byteOffset, 0x2D2B5);
        this.boxKey1 = key.subarray(0x100, 0x34BD0);
        this._blank = key.subarray(0x34BD0, 0x34BD0 + 0xE8);
        this.boxKey2 = key.subarray(0x40000, 0x40000 + 0x34AD0);
        this.slot1Key = key.subarray(0x80004, 0x80004 + 0x34AD0);
        if (this.magic != 0x42454546 )
        {
            this.magic = 0x42454546;

            if (!util.empty(key, 0x10, 0x4)) {
                this._blank.fill(0);
                util.copy(key, 0x10, this._blank, 0xE0, 0x4);
                var nicknameBytes = util.encodeUnicode16LE(eggnames[this._blank[0xE3] - 1]);
                util.copy(nicknameBytes, 0, this._blank, 0x40, nicknameBytes.length);
                PkBase.fixChk(this._blank);
                util.copy(PkBase.encrypt(this._blank), 0, this._blank, 0, 232);
            }
        }
    }
}

export default class SaveKey {
    private _keyData: Uint8Array;
    private _keyView: DataView;
    public get keyData(): Uint8Array {
        return this._keyData;
    }

    public get stamp(): string {
        return util.getStampSav(this._keyData, 0);
    }

    private get magic(): number {
        return this._keyView.getUint32(0x10, true);
    }

    private set magic(val: number) {
        this._keyView.setUint32(0x10, val, true);
    }

    private get kind(): number {
        return this._keyView.getUint16(0x14, true);
    }

    private set kind(val: number) {
        this._keyView.setUint16(0x14, val, true);
    }

    private get version(): number {
        return this._keyView.getUint16(0x16, true);
    }

    private set version(val: number) {
        this._keyView.setUint16(0x16, val, true);
    }

    public get generation(): number {
        return this._keyView.getUint32(0x18, true);
    }

    private get _generation(): number {
        return this._keyView.getUint32(0x18, true);
    }

    private set _generation(val: number) {
        this._keyView.setUint32(0x18, val, true);
    }

    public get boxOffset(): number {
        return this._keyView.getUint32(0x1C, true);
    }

    public set boxOffset(val: number) {
        this._keyView.setUint32(0x1C, val, true);
    }

    public get slot1Flag(): number {
        return this._keyView.getUint32(0x20, true);
    }

    public set slot1Flag(val: number) {
        this._keyView.setUint32(0x20, val, true);
    }

    private __blank: Uint8Array;
    public get blank(): Uint8Array {
        return this.__blank;
    }

    public set blank(val: Uint8Array) {
        util.copy(val, 0, this.__blank, 0, 232);
    }

    private __boxKey1: Uint8Array;
    public get boxKey1(): Uint8Array {
        return this.__boxKey1;
    }

    private get _boxKey1(): Uint8Array {
        return this.__boxKey1;
    }

    private set _boxKey1(val: Uint8Array) {
        util.copy(val, 0, this.__boxKey1, 0, 232 * 30 * (this.generation === 6 ? 31 : 32));
    }

    private __boxKey2: Uint8Array;
    public get boxKey2(): Uint8Array {
        return this.__boxKey2;
    }

    private get _boxKey2(): Uint8Array {
        return this.__boxKey2;
    }

    private set _boxKey2(val: Uint8Array) {
        util.copy(val, 0, this.__boxKey2, 0, 232 * 30 * (this.generation === 6 ? 31 : 32));
    }

    private __slot1Key: Uint8Array;
    public get slot1Key(): Uint8Array {
        return this.__slot1Key;
    }

    private get _slot1Key(): Uint8Array {
        return this.__slot1Key;
    }

    private set _slot1Key(val: Uint8Array) {
        util.copy(val, 0, this.__slot1Key, 0, 232 * 30 * (this.generation === 6 ? 31 : 32));
    }

    public get isNewKey(): boolean {
        return this.__slot1Key.some(e => !!e);
    }

    public get slotsUnlocked(): boolean[] {
        var res = [];
        for (var i = 0; i < (this.generation === 6 ? 930 : 960); ++i) {
            res.push(util.empty(this.boxKey1, i * 232, 232) && !util.empty(this.boxKey2, i * 232, 232))
        }
        return res;
    }

    constructor(arg: Uint8Array | number) {
        if (arg instanceof Uint8Array) {
            this._keyData = arg;
            this._keyView = util.createDataView(this._keyData);
            if (this.magic !== 0xCAFEBABE) {
                if (arg.length !== 0x80000 && arg.length !== 0xB4AD4) {
                    throw new Error("Not a save key.");
                }
                const legacyKey = new LegacySaveKey(arg);
                this._keyData = new Uint8Array(0x10C + 3 * 232 * 30 * 31);
                this._keyView = util.createDataView(this._keyData);
                util.copy(arg, 0 , this._keyData, 0, 8);
                this.magic = 0xCAFEBABE;
                this.kind = 0;
                this.version = 1;
                this._generation = 6;
                this.boxOffset = legacyKey.boxOffset;
                this.slot1Flag = legacyKey.slot1Flag;
                this.initializeArrays();
                this.blank = legacyKey.blank;
                this._boxKey1 = legacyKey.boxKey1;
                this._boxKey2 = legacyKey.boxKey2;
                this._slot1Key = legacyKey.slot1Key;
                return;
            }

            if (this.kind !== 0) {
                throw new Error("Not a save key.");
            }

            if (this.version !== 1) {
                throw new Error("Unknown save key version.");
            }

            const { generation } = this;
            if (generation !== 6 && generation !== 7) {
                throw new Error("Unknown generation.");
            }
            this.initializeArrays();
        } else {
            this._keyData = new Uint8Array(0x10C + 3 * 232 * 30 * (arg === 6 ? 31 : 32));
            this._keyView = util.createDataView(this._keyData);
            this.magic = 0xCAFEBABE;
            this.kind = 0;
            this.version = 1;
            this._generation = arg;
            this.initializeArrays();
        }
    }

    private initializeArrays() {
        let offset = 0x24;
        this.__blank = this._keyData.subarray(offset, offset + 232); offset += 232;
        const keySize = 232 * 30 * (this.generation === 6 ? 31 : 32);
        this.__boxKey1 = this._keyData.subarray(offset, offset + keySize); offset += keySize;
        this.__boxKey2 = this._keyData.subarray(offset, offset + keySize); offset += keySize;
        this.__slot1Key = this._keyData.subarray(offset, offset + keySize); offset += keySize;
    }

    public mergeKey(other: SaveKey) {
        // upgrade to a new style key if possible
        if (!this.isNewKey && other.isNewKey) {
            this._slot1Key = other.slot1Key;
            this.slot1Flag = other.slot1Flag;
        }
        for (var i = 0; i < (this.generation === 6 ? 930 : 960); ++i) {
            // this means our key is not complete for this slot
            if (!util.empty(this.boxKey1, i * 232, 232) || util.empty(this.boxKey2, i * 232, 232)) {
                // this slot is complete for the other key, just copy it
                if (util.empty(other.boxKey1, i * 232, 232) && !util.empty(other.boxKey2, i * 232, 232)) {
                    util.copy(other.boxKey1, i * 232, this.boxKey1, i * 232, 232);
                    util.copy(other.boxKey2, i * 232, this.boxKey2, i * 232, 232);
                    continue;
                }

                if (!util.empty(other.boxKey1, i * 232, 232))
                    SaveReaderEncrypted.getPkxRaw(other.boxKey1, i, this);
                if (!util.empty(other.boxKey2, i * 232, 232))
                    SaveReaderEncrypted.getPkxRaw(other.boxKey2, i, this);
            }
        }
    }

    public setStamp(arr: Uint8Array) {
        util.copy(arr, 0x10, this._keyData, 0, 8);
    }
}
