class HelperFunctions {
    static getInt32Bytes(x) {
        var bytes = [];
        var i = 4;
        do {
            bytes[--i] = x & (255);
            x = x >> 8;
        } while (i)
        return bytes;
    }

    static getInt64Bytes(x) {
        var bytes = [];
        var i = 8;
        do {
            bytes[--i] = x & (255);
            x = x >> 8;
        } while (i)
        return bytes;
    }

    static DecoderCounter(bytes) {
        var len = bytes.length;
        return bytes[len - 2] << 8 | bytes[len - 1]
    }

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports = HelperFunctions;
