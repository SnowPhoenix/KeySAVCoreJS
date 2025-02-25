import SaveReader from "./save-reader";
import SaveKey from "./save-key";
import SaveReaderEncrypted from "./save-reader-encrypted";
import SaveReaderDecrypted from "./save-reader-decrypted";
import { getKeyStore } from "./key-store";
import PkBase from "./pkbase";
import * as util from "./util";

const magic = 0x42454546;
export const eggnames: string[] = ["タマゴ", "Egg", "Œuf", "Uovo", "Ei", "", "Huevo", "알", "蛋", "蛋"];

function createNotASaveError() {
    var e = new Error("The supplied data is not a supported save type.") as any;
    e.name = "NotASaveError";
    return e;
}

export async function load(input: Uint8Array): Promise<SaveReader> {
    var view = util.createDataView(input);
    switch (input.length) {
        case 0x10009C:
        case 0x10019A:
            input = input.subarray(input.length - 0x100000);
        case 0x100000:
            var key = await getKeyStore().getSaveKey(util.getStampSav(input, 0x10));
            return new SaveReaderEncrypted(input, key);
        case 0x0fe09c:
        case 0x0fe19a:
            input = input.subarray(input.length - 0x0fe000);
        case 0xfe000:
            var key = await getKeyStore().getSaveKey(util.getStampSav(input, 0x10));
            return new SaveReaderEncrypted(input, key);
        case 0x76000:
            if (view.getUint32(0x75E10, true) != magic)
                throw createNotASaveError();
            return new SaveReaderDecrypted(input, "ORAS");
        case 0x65600:
            if (view.getUint32(0x65410, true) != magic)
                throw createNotASaveError();
            return new SaveReaderDecrypted(input, "XY");
        case 0x6BE00:
            return new SaveReaderDecrypted(input, "SM");
        case 232 * 30 * 32:
            return new SaveReaderDecrypted(input, "YABD");
        case 232 * 30 * 31:
            return new SaveReaderDecrypted(input, "PCDATA");
        case 0x70000:
            return new SaveReaderDecrypted(input, "ORASRAM");
        default:
            throw createNotASaveError();
    }
}



function upgradeKey(key: SaveKey, break1: Uint8Array, break2: Uint8Array): { result: number, pkx?: PkBase} {
    var reader1: SaveReader, reader2: SaveReader;
    var dataView1: DataView, dataView2: DataView;

    dataView1 = util.createDataView(break1);
    dataView2 = util.createDataView(break2);

    const generation = SaveReaderEncrypted.getGeneration(break1);
    const offsets = SaveReaderEncrypted.getOffsets(generation);

    if (key.isNewKey) {
        // Scan the two saves to improve the key.
        reader1 = new SaveReaderEncrypted(break1, key); reader1.scanSlots();
        reader2 = new SaveReaderEncrypted(break2, key); reader2.scanSlots();
        // We already have a key.
        return { result: 0 };
    }

    if (util.sequenceEqual(break1, offsets.base2, break2, offsets.base2, offsets.saveSize)) {
        // We have written to slot 1 in the second save
        key.slot1Flag = dataView2.getUint32(0x168, true);
    } else if (util.sequenceEqual(break1, offsets.base1, break2, offsets.base1, offsets.saveSize)) {
        // We have written to slot 2 in the second save and as such to slot 1 in the first save
        key.slot1Flag = dataView1.getUint32(0x168, true);
    } else {
        reader1 = new SaveReaderEncrypted(break1, key); reader1.scanSlots();
        reader2 = new SaveReaderEncrypted(break2, key); reader2.scanSlots();
        // The saves are seperated by more than one save. Couldn't upgrade to a new style key.
        return {
            result: 1,
            pkx: reader1.getPkx(0) || reader2.getPkx(30)
        };
    }

    // This XORpad can encode/decode between slot 1 and slot 2 data.
    util.xor(break1, key.boxOffset, break1, key.boxOffset - offsets.saveSize, key.slot1Key, 0, 232*30*(generation === 6 ? 31 : 32));

    reader1 = new SaveReaderEncrypted(break1, key); reader1.scanSlots();
    reader2 = new SaveReaderEncrypted(break2, key); reader2.scanSlots();

    // Successfully upgraded to a new style key.
    return {
        result: 2,
        pkx: reader1.getPkx(0) || reader2.getPkx(30)
    };
}


export async function breakKey(break1: Uint8Array, break2: Uint8Array): Promise<string> {
    var emptyPkx = new Uint8Array(232);
    var emptyEkx = PkBase.encrypt(emptyPkx);
    var key: SaveKey;
    var boxes1: Uint8Array, boxes2: Uint8Array;
    var boxesDataView1: DataView, boxesDataView2: DataView;

    const generation1 = SaveReaderEncrypted.getGeneration(break1);
    if (generation1 === -1) {
        let e = new Error("File 1 is not a valid save file.") as any;
        e.name = "NotASaveError";
        e.file = 1;
        throw e;
    }

    const generation2 = SaveReaderEncrypted.getGeneration(break2);
    if (generation2 === -1) {
        let e = new Error("File 2 is not a valid save file.") as any;
        e.name = "NotASaveError";
        e.file = 2;
        throw e;
    }

    if (generation1 !== generation2) {
        let e = new Error("Saves are not from the same generation.") as any;
        e.name = "SavesNotSameGenerationError";
        throw e;
    }

    const offsets = SaveReaderEncrypted.getOffsets(generation1);

    break1 = break1.subarray(break1.length % offsets.fileSize);
    break2 = break2.subarray(break2.length % offsets.fileSize);

    if (!util.sequenceEqual(break1, 16, break2, 16, 8)) {
        let e = new Error("The saves are not from the same game!");
        e.name = "NotSameGameError";
        throw e;
    }

    if (util.sequenceEqual(break1, break2)) {
        let e = new Error("The saves are identical.\nPlease follow the instructions.");
        e.name = "SaveIdenticalError";
        throw e;
    }

    // Let's try to upgrade an existing old style key to a new style key.
    try {
        key = await getKeyStore().getSaveKey(util.getStampSav(break1, 0x10));
        let res = upgradeKey(key, break1, break2);
        switch (res.result) {
            case 0:
                var e = new Error("You already have a key for this save.");
                e.name = "SaveKeyAlreadyExistsError";
                throw e;
            case 1:
                return "NOT_UPGRADED";
            case 2:
                return "UPGRADED";
        }
    } catch (e) {
        if (e.name === "SaveKeyAlreadyExistsError")
            throw e;
    }

    key = new SaveKey(generation1);

    boxes1 = break1.subarray(offsets.base2, offsets.base2 + offsets.saveSize);
    if (util.sequenceEqual(break1, offsets.base2, break2, offsets.base2, offsets.saveSize)) {
        // We have written to only slot 1 in the second save
        boxes2 = util.xorThree(break1, offsets.base1, break1, offsets.base2, break2, offsets.base1, offsets.saveSize);
    } else {
        boxes2 = break2.subarray(offsets.base2, offsets.base2 + offsets.saveSize);
    }

    boxesDataView1 = util.createDataView(boxes1);
    boxesDataView2 = util.createDataView(boxes2);

    var offset: number = undefined ;
    var potentialOffsets = generation1 === 6 ? [0x26A00 /* XY */, 0x37400 /* ORAS */] : [0x8200 /* SM */];

    const indices = [0, 232, 464, 696, 928, 1160]; // the first six multiples of 232
    for (let i of potentialOffsets) {
        // Check that sanity placeholders are the same for all six Pokémon
        if (indices.some((j) => boxesDataView1.getUint16(i + j + 4, true) != boxesDataView2.getUint16(i + j + 4, true))) {
            continue;
        }

        // If the PID is equal for both saves this is not our offset since the Pokémon were supposed to be moved
        if (indices.some((j) => boxesDataView1.getUint32(i + j, true) == boxesDataView2.getUint32(i + j, true))) {
            continue;
        }

        let err = 0;
        for (var j = 8; j < 232; j++) {
            if (boxes1[i + j] == boxes2[i + j])
                err++;
        }

        if (err < 56) {
            offset = i + offsets.base2; // Add the offset for the actual save inside the save file
            // TODO break for 32 boxes in gen 7
            boxes1 = boxes1.subarray(i, i + 232 * 30 * 31);
            boxes2 = boxes2.subarray(i, i + 232 * 30 * 31);
            break;
        }
    }

    if (offset === undefined) {
        var e = new Error("Unable to find boxes.");
        e.name = "NoBoxesError";
        throw e;
    }

    boxesDataView1 = util.createDataView(boxes1);
    boxesDataView2 = util.createDataView(boxes2);

    // To get the keystream we need to get the complete empty ekx. It contains location data 0xE0-0xE3 and the egg name.
    // 0x00000000 Encryption Constant has the D block last.
    // We need a Pokémon with block D somewhere else so we can get the location data.
    var valid = false;
    for (let i of indices) {
        // First, let's get out our EKXs with bytes 0xE0-0xE3 random.
        var incompleteEkx = util.xorThree(boxes1, i, boxes2, i, emptyEkx, 0, 232);
        let encryptionConstant = util.createDataView(incompleteEkx).getUint32(0, true);

        // If Block D is last, the location data wouldn't be correct and we need that to fix the keystream.
        if (PkBase.getDloc(encryptionConstant) != 3) {
            var incompletePkx = PkBase.decrypt(incompleteEkx);
            if (incompletePkx[0xE3] >= 8) {
                console.log('uhm, this shouldn\'t happen');
                continue;
            }

            valid = true;
            var nickName = eggnames[incompletePkx[0xE3] - 1];
            var nicknameBytes = util.encodeUnicode16LE(nickName);
            util.copy(nicknameBytes, 0, emptyPkx, 64, nicknameBytes.length);

            // Dump it into our Blank EKX. We have won!
            util.copy(incompletePkx, 0xE0, emptyPkx, 0xE0, 4);
            break;
        }
    }

    if (!valid) {
        // We didn't get any valid EC's where D was not in last. Tell the user to try again with different specimens.
        var e = new Error("The 6 supplied Pokemon are not suitable.");
        e.name = "PokemonNotSuitableError";
        throw e;
    }

    // This is now the complete blank pkx.
    PkBase.fixChk(emptyPkx);
    emptyEkx = PkBase.encrypt(emptyPkx);

    key.setStamp(break1);
    key.blank = emptyEkx;
    key.boxOffset = offset;

    var result = upgradeKey(key, break1, break2);
    var zeros = new Uint8Array(232);
    var ezeros = PkBase.encrypt(zeros);
    if (result.result === 2) {
        // Set the keys for slots 1-6 in boxes 1 and 2
        for (let i of indices) {
            for (let empty of [ezeros, emptyEkx]) {
                if (PkBase.verifyChk(PkBase.decrypt(util.xorThree(boxes1, i + 232 * 30, empty, 0, boxes2, i + 232 * 30, 232)))) {
                    util.copy(zeros, 0, key.boxKey1, i + 232 * 30, 232);
                    util.xor(boxes1, i + 232 * 30, empty, 0, key.boxKey2, i + 232 * 30, 232);
                    break;
                }
            }
            for (let empty of [ezeros, emptyEkx]) {
                if (PkBase.verifyChk(PkBase.decrypt(util.xorThree(boxes2, i, empty, 0, boxes1, i, 232)))) {
                    util.copy(zeros, 0, key.boxKey1, i, 232);
                    util.xor(boxes2, i, empty, 0, key.boxKey2, i, 232);
                    break;
                }
            }
        }

        await getKeyStore().setSaveKey(key);

        return "CREATED_NEW";
    } else {
        await getKeyStore().setSaveKey(key);

        return "CREATED_OLD";
    }
}
