import PkBase, { registerPkmImpl } from "./pkbase";
import * as util from "./util";

export default class Pk7 extends PkBase {
    constructor(pkx: Uint8Array, box: number, slot: number, isGhost: boolean) {
        super(pkx, box, slot, isGhost);

        this.version = 7;

        const data: DataView = util.createDataView(pkx);

        this.markings = data.getUint16(0x16);
    }
}

registerPkmImpl(7, Pk7);
