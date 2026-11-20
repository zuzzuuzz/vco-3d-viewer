/*
References:
- "LZMA SDK" by Igor Pavlov
  http://www.7-zip.org/sdk.html
*/

var LZMA = LZMA || {};

LZMA.OutWindow = function(){
  this._windowSize = 0;
};

LZMA.OutWindow.prototype.create = function(windowSize){
  if ( (!this._buffer) || (this._windowSize !== windowSize) ){
    this._buffer = [];
  }
  this._windowSize = windowSize;
  this._pos = 0;
  this._streamPos = 0;
};

LZMA.OutWindow.prototype.flush = function(){
  var size = this._pos - this._streamPos;
  if (size !== 0){
    while(size --){
      this._stream.writeByte(this._buffer[this._streamPos ++]);
    }
    if (this._pos >= this._windowSize){
      this._pos = 0;
    }
    this._streamPos = this._pos;
  }
};

LZMA.OutWindow.prototype.releaseStream = function(){
  this.flush();
  this._stream = null;
};

LZMA.OutWindow.prototype.setStream = function(stream){
  this.releaseStream();
  this._stream = stream;
};

LZMA.OutWindow.prototype.init = function(solid){
  if (!solid){
    this._streamPos = 0;
    this._pos = 0;
  }
};

LZMA.OutWindow.prototype.copyBlock = function(distance, len){
  var pos = this._pos - distance - 1;
  if (pos < 0){
    pos += this._windowSize;
  }
  while(len --){
    if (pos >= this._windowSize){
      pos = 0;
    }
    this._buffer[this._pos ++] = this._buffer[pos ++];
    if (this._pos >= this._windowSize){
      this.flush();
    }
  }
};

LZMA.OutWindow.prototype.putByte = function(b){
  this._buffer[this._pos ++] = b;
  if (this._pos >= this._windowSize){
    this.flush();
  }
};

LZMA.OutWindow.prototype.getByte = function(distance){
  var pos = this._pos - distance - 1;
  if (pos < 0){
    pos += this._windowSize;
  }
  return this._buffer[pos];
};

LZMA.RangeDecoder = function(){
};

LZMA.RangeDecoder.prototype.setStream = function(stream){
  this._stream = stream;
};

LZMA.RangeDecoder.prototype.releaseStream = function(){
  this._stream = null;
};

LZMA.RangeDecoder.prototype.init = function(){
  var i = 5;

  this._code = 0;
  this._range = -1;
  
  while(i --){
    this._code = (this._code << 8) | this._stream.readByte();
  }
};

LZMA.RangeDecoder.prototype.decodeDirectBits = function(numTotalBits){
  var result = 0, i = numTotalBits, t;

  while(i --){
    this._range >>>= 1;
    t = (this._code - this._range) >>> 31;
    this._code -= this._range & (t - 1);
    result = (result << 1) | (1 - t);

    if ( (this._range & 0xff000000) === 0){
      this._code = (this._code << 8) | this._stream.readByte();
      this._range <<= 8;
    }
  }

  return result;
};

LZMA.RangeDecoder.prototype.decodeBit = function(probs, index){
  var prob = probs[index],
      newBound = (this._range >>> 11) * prob;

  if ( (this._code ^ 0x80000000) < (newBound ^ 0x80000000) ){
    this._range = newBound;
    probs[index] += (2048 - prob) >>> 5;
    if ( (this._range & 0xff000000) === 0){
      this._code = (this._code << 8) | this._stream.readByte();
      this._range <<= 8;
    }
    return 0;
  }

  this._range -= newBound;
  this._code -= newBound;
  probs[index] -= prob >>> 5;
  if ( (this._range & 0xff000000) === 0){
    this._code = (this._code << 8) | this._stream.readByte();
    this._range <<= 8;
  }
  return 1;
};

LZMA.initBitModels = function(probs, len){
  while(len --){
    probs[len] = 1024;
  }
};

LZMA.BitTreeDecoder = function(numBitLevels){
  this._models = [];
  this._numBitLevels = numBitLevels;
};

LZMA.BitTreeDecoder.prototype.init = function(){
  LZMA.initBitModels(this._models, 1 << this._numBitLevels);
};

LZMA.BitTreeDecoder.prototype.decode = function(rangeDecoder){
  var m = 1, i = this._numBitLevels;

  while(i --){
    m = (m << 1) | rangeDecoder.decodeBit(this._models, m);
  }
  return m - (1 << this._numBitLevels);
};

LZMA.BitTreeDecoder.prototype.reverseDecode = function(rangeDecoder){
  var m = 1, symbol = 0, i = 0, bit;

  for (; i < this._numBitLevels; ++ i){
    bit = rangeDecoder.decodeBit(this._models, m);
    m = (m << 1) | bit;
    symbol |= bit << i;
  }
  return symbol;
};

LZMA.reverseDecode2 = function(models, startIndex, rangeDecoder, numBitLevels){
  var m = 1, symbol = 0, i = 0, bit;

  for (; i < numBitLevels; ++ i){
    bit = rangeDecoder.decodeBit(models, startIndex + m);
    m = (m << 1) | bit;
    symbol |= bit << i;
  }
  return symbol;
};

LZMA.LenDecoder = function(){
  this._choice = [];
  this._lowCoder = [];
  this._midCoder = [];
  this._highCoder = new LZMA.BitTreeDecoder(8);
  this._numPosStates = 0;
};

LZMA.LenDecoder.prototype.create = function(numPosStates){
  for (; this._numPosStates < numPosStates; ++ this._numPosStates){
    this._lowCoder[this._numPosStates] = new LZMA.BitTreeDecoder(3);
    this._midCoder[this._numPosStates] = new LZMA.BitTreeDecoder(3);
  }
};

LZMA.LenDecoder.prototype.init = function(){
  var i = this._numPosStates;
  LZMA.initBitModels(this._choice, 2);
  while(i --){
    this._lowCoder[i].init();
    this._midCoder[i].init();
  }
  this._highCoder.init();
};

LZMA.LenDecoder.prototype.decode = function(rangeDecoder, posState){
  if (rangeDecoder.decodeBit(this._choice, 0) === 0){
    return this._lowCoder[posState].decode(rangeDecoder);
  }
  if (rangeDecoder.decodeBit(this._choice, 1) === 0){
    return 8 + this._midCoder[posState].decode(rangeDecoder);
  }
  return 16 + this._highCoder.decode(rangeDecoder);
};

LZMA.Decoder2 = function(){
  this._decoders = [];
};

LZMA.Decoder2.prototype.init = function(){
  LZMA.initBitModels(this._decoders, 0x300);
};

LZMA.Decoder2.prototype.decodeNormal = function(rangeDecoder){
  var symbol = 1;

  do{
    symbol = (symbol << 1) | rangeDecoder.decodeBit(this._decoders, symbol);
  }while(symbol < 0x100);

  return symbol & 0xff;
};

LZMA.Decoder2.prototype.decodeWithMatchByte = function(rangeDecoder, matchByte){
  var symbol = 1, matchBit, bit;

  do{
    matchBit = (matchByte >> 7) & 1;
    matchByte <<= 1;
    bit = rangeDecoder.decodeBit(this._decoders, ( (1 + matchBit) << 8) + symbol);
    symbol = (symbol << 1) | bit;
    if (matchBit !== bit){
      while(symbol < 0x100){
        symbol = (symbol << 1) | rangeDecoder.decodeBit(this._decoders, symbol);
      }
      break;
    }
  }while(symbol < 0x100);

  return symbol & 0xff;
};

LZMA.LiteralDecoder = function(){
};

LZMA.LiteralDecoder.prototype.create = function(numPosBits, numPrevBits){
  var i;

  if (this._coders
    && (this._numPrevBits === numPrevBits)
    && (this._numPosBits === numPosBits) ){
    return;
  }
  this._numPosBits = numPosBits;
  this._posMask = (1 << numPosBits) - 1;
  this._numPrevBits = numPrevBits;

  this._coders = [];

  i = 1 << (this._numPrevBits + this._numPosBits);
  while(i --){
    this._coders[i] = new LZMA.Decoder2();
  }
};

LZMA.LiteralDecoder.prototype.init = function(){
  var i = 1 << (this._numPrevBits + this._numPosBits);
  while(i --){
    this._coders[i].init();
  }
};

LZMA.LiteralDecoder.prototype.getDecoder = function(pos, prevByte){
  return this._coders[( (pos & this._posMask) << this._numPrevBits)
    + ( (prevByte & 0xff) >>> (8 - this._numPrevBits) )];
};

LZMA.Decoder = function(){
  this._outWindow = new LZMA.OutWindow();
  this._rangeDecoder = new LZMA.RangeDecoder();
  this._isMatchDecoders = [];
  this._isRepDecoders = [];
  this._isRepG0Decoders = [];
  this._isRepG1Decoders = [];
  this._isRepG2Decoders = [];
  this._isRep0LongDecoders = [];
  this._posSlotDecoder = [];
  this._posDecoders = [];
  this._posAlignDecoder = new LZMA.BitTreeDecoder(4);
  this._lenDecoder = new LZMA.LenDecoder();
  this._repLenDecoder = new LZMA.LenDecoder();
  this._literalDecoder = new LZMA.LiteralDecoder();
  this._dictionarySize = -1;
  this._dictionarySizeCheck = -1;

  this._posSlotDecoder[0] = new LZMA.BitTreeDecoder(6);
  this._posSlotDecoder[1] = new LZMA.BitTreeDecoder(6);
  this._posSlotDecoder[2] = new LZMA.BitTreeDecoder(6);
  this._posSlotDecoder[3] = new LZMA.BitTreeDecoder(6);
};

LZMA.Decoder.prototype.setDictionarySize = function(dictionarySize){
  if (dictionarySize < 0){
    return false;
  }
  if (this._dictionarySize !== dictionarySize){
    this._dictionarySize = dictionarySize;
    this._dictionarySizeCheck = Math.max(this._dictionarySize, 1);
    this._outWindow.create( Math.max(this._dictionarySizeCheck, 4096) );
  }
  return true;
};

LZMA.Decoder.prototype.setLcLpPb = function(lc, lp, pb){
  var numPosStates = 1 << pb;

  if (lc > 8 || lp > 4 || pb > 4){
    return false;
  }

  this._literalDecoder.create(lp, lc);

  this._lenDecoder.create(numPosStates);
  this._repLenDecoder.create(numPosStates);
  this._posStateMask = numPosStates - 1;

  return true;
};

LZMA.Decoder.prototype.init = function(){
  var i = 4;

  this._outWindow.init(false);

  LZMA.initBitModels(this._isMatchDecoders, 192);
  LZMA.initBitModels(this._isRep0LongDecoders, 192);
  LZMA.initBitModels(this._isRepDecoders, 12);
  LZMA.initBitModels(this._isRepG0Decoders, 12);
  LZMA.initBitModels(this._isRepG1Decoders, 12);
  LZMA.initBitModels(this._isRepG2Decoders, 12);
  LZMA.initBitModels(this._posDecoders, 114);

  this._literalDecoder.init();

  while(i --){
    this._posSlotDecoder[i].init();
  }

  this._lenDecoder.init();
  this._repLenDecoder.init();
  this._posAlignDecoder.init();
  this._rangeDecoder.init();
};

LZMA.Decoder.prototype.decode = function(inStream, outStream, outSize){
  var state = 0, rep0 = 0, rep1 = 0, rep2 = 0, rep3 = 0, nowPos64 = 0, prevByte = 0,
      posState, decoder2, len, distance, posSlot, numDirectBits;

  this._rangeDecoder.setStream(inStream);
  this._outWindow.setStream(outStream);

  this.init();

  while(outSize < 0 || nowPos64 < outSize){
    posState = nowPos64 & this._posStateMask;

    if (this._rangeDecoder.decodeBit(this._isMatchDecoders, (state << 4) + posState) === 0){
      decoder2 = this._literalDecoder.getDecoder(nowPos64 ++, prevByte);

      if (state >= 7){
        prevByte = decoder2.decodeWithMatchByte(this._rangeDecoder, this._outWindow.getByte(rep0) );
      }else{
        prevByte = decoder2.decodeNormal(this._rangeDecoder);
      }
      this._outWindow.putByte(prevByte);

      state = state < 4? 0: state - (state < 10? 3: 6);

    }else{

      if (this._rangeDecoder.decodeBit(this._isRepDecoders, state) === 1){
        len = 0;
        if (this._rangeDecoder.decodeBit(this._isRepG0Decoders, state) === 0){
          if (this._rangeDecoder.decodeBit(this._isRep0LongDecoders, (state << 4) + posState) === 0){
            state = state < 7? 9: 11;
            len = 1;
          }
        }else{
          if (this._rangeDecoder.decodeBit(this._isRepG1Decoders, state) === 0){
            distance = rep1;
          }else{
            if (this._rangeDecoder.decodeBit(this._isRepG2Decoders, state) === 0){
              distance = rep2;
            }else{
              distance = rep3;
              rep3 = rep2;
            }
            rep2 = rep1;
          }
          rep1 = rep0;
          rep0 = distance;
        }
        if (len === 0){
          len = 2 + this._repLenDecoder.decode(this._rangeDecoder, posState);
          state = state < 7? 8: 11;
        }
      }else{
        rep3 = rep2;
        rep2 = rep1;
        rep1 = rep0;

        len = 2 + this._lenDecoder.decode(this._rangeDecoder, posState);
        state = state < 7? 7: 10;

        posSlot = this._posSlotDecoder[len <= 5? len - 2: 3].decode(this._rangeDecoder);
        if (posSlot >= 4){

          numDirectBits = (posSlot >> 1) - 1;
          rep0 = (2 | (posSlot & 1) ) << numDirectBits;

          if (posSlot < 14){
            rep0 += LZMA.reverseDecode2(this._posDecoders,
                rep0 - posSlot - 1, this._rangeDecoder, numDirectBits);
          }else{
            rep0 += this._rangeDecoder.decodeDirectBits(numDirectBits - 4) << 4;
            rep0 += this._posAlignDecoder.reverseDecode(this._rangeDecoder);
            if (rep0 < 0){
              if (rep0 === -1){
                break;
              }
              return false;
            }
          }
        }else{
          rep0 = posSlot;
        }
      }

      if (rep0 >= nowPos64 || rep0 >= this._dictionarySizeCheck){
        return false;
      }

      this._outWindow.copyBlock(rep0, len);
      nowPos64 += len;
      prevByte = this._outWindow.getByte(0);
    }
  }

  this._outWindow.flush();
  this._outWindow.releaseStream();
  this._rangeDecoder.releaseStream();

  return true;
};

LZMA.Decoder.prototype.setDecoderProperties = function(properties){
  var value, lc, lp, pb, dictionarySize;

  if (properties.size < 5){
    return false;
  }

  value = properties.readByte();
  lc = value % 9;
  value = ~~(value / 9);
  lp = value % 5;
  pb = ~~(value / 5);

  if ( !this.setLcLpPb(lc, lp, pb) ){
    return false;
  }

  dictionarySize = properties.readByte();
  dictionarySize |= properties.readByte() << 8;
  dictionarySize |= properties.readByte() << 16;
  dictionarySize += properties.readByte() * 16777216;

  return this.setDictionarySize(dictionarySize);
};

LZMA.decompress = function(properties, inStream, outStream, outSize){
  var decoder = new LZMA.Decoder();

  if ( !decoder.setDecoderProperties(properties) ){
    throw "Incorrect stream properties";
  }

  if ( !decoder.decode(inStream, outStream, outSize) ){
    throw "Error in data stream";
  }

  return true;
};

LZMA.decompressFile = function(inStream, outStream){
  var decoder = new LZMA.Decoder(), outSize;

  if ( !decoder.setDecoderProperties(inStream) ){
    throw "Incorrect stream properties";
  }

  outSize = inStream.readByte();
  outSize |= inStream.readByte() << 8;
  outSize |= inStream.readByte() << 16;
  outSize += inStream.readByte() * 16777216;

  inStream.readByte();
  inStream.readByte();
  inStream.readByte();
  inStream.readByte();

  if ( !decoder.decode(inStream, outStream, outSize) ){
    throw "Error in data stream";
  }

  return true;
};


// ctm.js

/*
OpenCTM
Copyright (c) 2009-2010 Marcus Geelnard

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

    1. The origin of this software must not be misrepresented; you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.

    2. Altered source versions must be plainly marked as such, and must not
    be misrepresented as being the original software.

    3. This notice may not be removed or altered from any source
    distribution.

js-openctm
Copyright (c) 2011 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


var CTM = CTM || {};

CTM.CompressionMethod = {
  RAW: 0x00574152,
  MG1: 0x0031474d,
  MG2: 0x0032474d
};

CTM.Flags = {
  NORMALS: 0x00000001
};

CTM.File = function(stream){
  this.load(stream);
};

CTM.File.prototype.load = function(stream){
  this.header = new CTM.FileHeader(stream);

  this.body = new CTM.FileBody(this.header);
  
  this.getReader().read(stream, this.body);
};

CTM.File.prototype.getReader = function(){
  var reader;

  switch(this.header.compressionMethod){
    case CTM.CompressionMethod.RAW:
      reader = new CTM.ReaderRAW();
      break;
    case CTM.CompressionMethod.MG1:
      reader = new CTM.ReaderMG1();
      break;
    case CTM.CompressionMethod.MG2:
      reader = new CTM.ReaderMG2();
      break;
  }

  return reader;
};

CTM.FileHeader = function(stream){
  stream.readInt32(); //magic "OCTM"
  this.fileFormat = stream.readInt32();
  this.compressionMethod = stream.readInt32();
  this.vertexCount = stream.readInt32();
  this.triangleCount = stream.readInt32();
  this.uvMapCount = stream.readInt32();
  this.attrMapCount = stream.readInt32();
  this.flags = stream.readInt32();
  this.comment = stream.readString();
};

CTM.FileHeader.prototype.hasNormals = function(){
  return this.flags & CTM.Flags.NORMALS;
};

CTM.FileBody = function(header){
  var i = header.triangleCount * 3,
      v = header.vertexCount * 3,
      n = header.hasNormals()? header.vertexCount * 3: 0,
      u = header.vertexCount * 2,
      a = header.vertexCount * 4,
      j = 0;

  var data = new ArrayBuffer(
    (i + v + n + (u * header.uvMapCount) + (a * header.attrMapCount) ) * 4);

  this.indices = new Uint32Array(data, 0, i);

  this.vertices = new Float32Array(data, i * 4, v);

  if ( header.hasNormals() ){
    this.normals = new Float32Array(data, (i + v) * 4, n);
  }
  
  if (header.uvMapCount){
    this.uvMaps = [];
    for (j = 0; j < header.uvMapCount; ++ j){
      this.uvMaps[j] = {uv: new Float32Array(data,
        (i + v + n + (j * u) ) * 4, u) };
    }
  }
  
  if (header.attrMapCount){
    this.attrMaps = [];
    for (j = 0; j < header.attrMapCount; ++ j){
      this.attrMaps[j] = {attr: new Float32Array(data,
        (i + v + n + (u * header.uvMapCount) + (j * a) ) * 4, a) };
    }
  }
};

CTM.FileMG2Header = function(stream){
  stream.readInt32(); //magic "MG2H"
  this.vertexPrecision = stream.readFloat32();
  this.normalPrecision = stream.readFloat32();
  this.lowerBoundx = stream.readFloat32();
  this.lowerBoundy = stream.readFloat32();
  this.lowerBoundz = stream.readFloat32();
  this.higherBoundx = stream.readFloat32();
  this.higherBoundy = stream.readFloat32();
  this.higherBoundz = stream.readFloat32();
  this.divx = stream.readInt32();
  this.divy = stream.readInt32();
  this.divz = stream.readInt32();
  
  this.sizex = (this.higherBoundx - this.lowerBoundx) / this.divx;
  this.sizey = (this.higherBoundy - this.lowerBoundy) / this.divy;
  this.sizez = (this.higherBoundz - this.lowerBoundz) / this.divz;
};

CTM.ReaderRAW = function(){
};

CTM.ReaderRAW.prototype.read = function(stream, body){
  this.readIndices(stream, body.indices);
  this.readVertices(stream, body.vertices);
  
  if (body.normals){
    this.readNormals(stream, body.normals);
  }
  if (body.uvMaps){
    this.readUVMaps(stream, body.uvMaps);
  }
  if (body.attrMaps){
    this.readAttrMaps(stream, body.attrMaps);
  }
};

CTM.ReaderRAW.prototype.readIndices = function(stream, indices){
  stream.readInt32(); //magic "INDX"
  stream.readArrayInt32(indices);
};

CTM.ReaderRAW.prototype.readVertices = function(stream, vertices){
  stream.readInt32(); //magic "VERT"
  stream.readArrayFloat32(vertices);
};

CTM.ReaderRAW.prototype.readNormals = function(stream, normals){
  stream.readInt32(); //magic "NORM"
  stream.readArrayFloat32(normals);
};

CTM.ReaderRAW.prototype.readUVMaps = function(stream, uvMaps){
  for (var i = 0; i < uvMaps.length; ++ i){
    stream.readInt32(); //magic "TEXC"

    uvMaps[i].name = stream.readString();
    uvMaps[i].filename = stream.readString();
    stream.readArrayFloat32(uvMaps[i].uv);
  }
};

CTM.ReaderRAW.prototype.readAttrMaps = function(stream, attrMaps){
  for (var i = 0; i < attrMaps.length; ++ i){
    stream.readInt32(); //magic "ATTR"

    attrMaps[i].name = stream.readString();
    stream.readArrayFloat32(attrMaps[i].attr);
  }
};

CTM.ReaderMG1 = function(){
};

CTM.ReaderMG1.prototype.read = function(stream, body){
  this.readIndices(stream, body.indices);
  this.readVertices(stream, body.vertices);
  
  if (body.normals){
    this.readNormals(stream, body.normals);
  }
  if (body.uvMaps){
    this.readUVMaps(stream, body.uvMaps);
  }
  if (body.attrMaps){
    this.readAttrMaps(stream, body.attrMaps);
  }
};

CTM.ReaderMG1.prototype.readIndices = function(stream, indices){
  stream.readInt32(); //magic "INDX"
  stream.readInt32(); //packed size
  
  var interleaved = new CTM.InterleavedStream(indices, 3);
  LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

  CTM.restoreIndices(indices, indices.length);
};

CTM.ReaderMG1.prototype.readVertices = function(stream, vertices){
  stream.readInt32(); //magic "VERT"
  stream.readInt32(); //packed size
  
  var interleaved = new CTM.InterleavedStream(vertices, 1);
  LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
};

CTM.ReaderMG1.prototype.readNormals = function(stream, normals){
  stream.readInt32(); //magic "NORM"
  stream.readInt32(); //packed size

  var interleaved = new CTM.InterleavedStream(normals, 3);
  LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
};

CTM.ReaderMG1.prototype.readUVMaps = function(stream, uvMaps){
  for (var i = 0; i < uvMaps.length; ++ i){
    stream.readInt32(); //magic "TEXC"

    uvMaps[i].name = stream.readString();
    uvMaps[i].filename = stream.readString();
    
    stream.readInt32(); //packed size

    var interleaved = new CTM.InterleavedStream(uvMaps[i].uv, 2);
    LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
  }
};

CTM.ReaderMG1.prototype.readAttrMaps = function(stream, attrMaps){
  for (var i = 0; i < attrMaps.length; ++ i){
    stream.readInt32(); //magic "ATTR"

    attrMaps[i].name = stream.readString();
    
    stream.readInt32(); //packed size

    var interleaved = new CTM.InterleavedStream(attrMaps[i].attr, 4);
    LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
  }
};

CTM.ReaderMG2 = function(){
};

CTM.ReaderMG2.prototype.read = function(stream, body){
  this.MG2Header = new CTM.FileMG2Header(stream);
  
  this.readVertices(stream, body.vertices);
  this.readIndices(stream, body.indices);
  
  if (body.normals){
    this.readNormals(stream, body);
  }
  if (body.uvMaps){
    this.readUVMaps(stream, body.uvMaps);
  }
  if (body.attrMaps){
    this.readAttrMaps(stream, body.attrMaps);
  }
};

CTM.ReaderMG2.prototype.readVertices = function(stream, vertices){
  stream.readInt32(); //magic "VERT"
  stream.readInt32(); //packed size

  var interleaved = new CTM.InterleavedStream(vertices, 3);
  LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
  
  var gridIndices = this.readGridIndices(stream, vertices);
  
  CTM.restoreVertices(vertices, this.MG2Header, gridIndices, this.MG2Header.vertexPrecision);
};

CTM.ReaderMG2.prototype.readGridIndices = function(stream, vertices){
  stream.readInt32(); //magic "GIDX"
  stream.readInt32(); //packed size
  
  var gridIndices = new Uint32Array(vertices.length / 3);
  
  var interleaved = new CTM.InterleavedStream(gridIndices, 1);
  LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
  
  CTM.restoreGridIndices(gridIndices, gridIndices.length);
  
  return gridIndices;
};

CTM.ReaderMG2.prototype.readIndices = function(stream, indices){
  stream.readInt32(); //magic "INDX"
  stream.readInt32(); //packed size

  var interleaved = new CTM.InterleavedStream(indices, 3);
  LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

  CTM.restoreIndices(indices, indices.length);
};

CTM.ReaderMG2.prototype.readNormals = function(stream, body){
  stream.readInt32(); //magic "NORM"
  stream.readInt32(); //packed size

  var interleaved = new CTM.InterleavedStream(body.normals, 3);
  LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

  var smoothNormals = CTM.calcSmoothNormals(body.indices, body.vertices);

  CTM.restoreNormals(body.normals, smoothNormals, this.MG2Header.normalPrecision);
};

CTM.ReaderMG2.prototype.readUVMaps = function(stream, uvMaps){
  for (var i = 0; i < uvMaps.length; ++ i){
    stream.readInt32(); //magic "TEXC"

    uvMaps[i].name = stream.readString();
    uvMaps[i].filename = stream.readString();
    
    var precision = stream.readFloat32();
    
    stream.readInt32(); //packed size

    var interleaved = new CTM.InterleavedStream(uvMaps[i].uv, 2);
    LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
    
    CTM.restoreMap(uvMaps[i].uv, 2, precision);
  }
};

CTM.ReaderMG2.prototype.readAttrMaps = function(stream, attrMaps){
  for (var i = 0; i < attrMaps.length; ++ i){
    stream.readInt32(); //magic "ATTR"

    attrMaps[i].name = stream.readString();
    
    var precision = stream.readFloat32();
    
    stream.readInt32(); //packed size

    var interleaved = new CTM.InterleavedStream(attrMaps[i].attr, 4);
    LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
    
    CTM.restoreMap(attrMaps[i].attr, 4, precision);
  }
};

CTM.restoreIndices = function(indices, len){
  if (len > 0){
    indices[2] += indices[0];
  }
  for (var i = 3; i < len; i += 3){
    indices[i] += indices[i - 3];
    
    if (indices[i] === indices[i - 3]){
      indices[i + 1] += indices[i - 2];
    }else{
      indices[i + 1] += indices[i];
    }

    indices[i + 2] += indices[i];
  }
};

CTM.restoreGridIndices = function(gridIndices, len){
  for (var i = 1; i < len; ++ i){
    gridIndices[i] += gridIndices[i - 1];
  }
};

CTM.restoreVertices = function(vertices, grid, gridIndices, precision){
  var verticesIndices = new Uint32Array(vertices.buffer, vertices.byteOffset),
      gridOrigin = [], gridIdx, delta, prevGridIndex = 0x7fffffff, prevDelta = 0;

  for (var i = 0, j = 0; i < gridIndices.length; ++ i, j += 3){
    gridIdx = gridIndices[i];
    
    CTM.gridIdxToPoint(grid, gridIdx, gridOrigin);

    delta = verticesIndices[j];
    if (gridIdx === prevGridIndex){
      delta += prevDelta;
    }

    vertices[j]     = gridOrigin[0] + precision * delta;
    vertices[j + 1] = gridOrigin[1] + precision * verticesIndices[j + 1];
    vertices[j + 2] = gridOrigin[2] + precision * verticesIndices[j + 2];

    prevGridIndex = gridIdx;
    prevDelta = delta;
  }
};

CTM.restoreNormals = function(normals, smoothNormals, precision){
  var intNormals = new Uint32Array(normals.buffer, normals.byteOffset),
    n = [], basis = [], magn, intPhi, phi, thetaScale, theta, sinPhi;

  for (var i = 0; i < normals.length; i += 3){
    magn = intNormals[i] * precision;
    
    intPhi = intNormals[i + 1];
    
    if (intPhi === 0){
      theta = - Math.PI;
    }else{
      if (intPhi <= 4){
        thetaScale = 0.5;
      }else{
        thetaScale = 2.0 / intPhi;
      }
      theta = (intNormals[i + 2] * thetaScale - 1) * Math.PI;
    }
    
    phi = intPhi * 0.5 * Math.PI * precision;
    
    sinPhi = Math.sin(phi);
    
    n[0] = sinPhi * Math.cos(theta) * magn;
    n[1] = sinPhi * Math.sin(theta) * magn;
    n[2] = Math.cos(phi) * magn;
    
    CTM.makeNormalCoordSys(smoothNormals, i, basis);
    
    normals[i]     = basis[0] * n[0] + basis[3] * n[1] + basis[6] * n[2];
    normals[i + 1] = basis[1] * n[0] + basis[4] * n[1] + basis[7] * n[2];
    normals[i + 2] = basis[2] * n[0] + basis[5] * n[1] + basis[8] * n[2];
  }
};

CTM.restoreMap = function(map, count, precision){
  var mapIndices = new Uint32Array(map.buffer, map.byteOffset),
    delta, value;

  for (var i = 0; i < count; ++ i){
    delta = 0;

    for (var j = i; j < map.length; j += count){
      value = mapIndices[j];
      
      delta += value & 1? -( (value + 1) >> 1): value >> 1;
      
      map[j] = delta * precision;
    }
  }
};

CTM.gridIdxToPoint = function(grid, gridIdx, gridOrigin){
  var zdiv = grid.divx * grid.divy,
      ydiv = grid.divx,
      point = [];

  point[2] = ~~(gridIdx / zdiv);
  
  gridIdx -= ~~(point[2] * zdiv);
  point[1] = ~~(gridIdx / ydiv);
  
  gridIdx -= ~~(point[1] * ydiv);
  point[0] = gridIdx;

  gridOrigin[0] = grid.lowerBoundx + point[0] * grid.sizex;
  gridOrigin[1] = grid.lowerBoundy + point[1] * grid.sizey;
  gridOrigin[2] = grid.lowerBoundz + point[2] * grid.sizez;
};

CTM.calcSmoothNormals = function(indices, vertices){
  var smoothNormals = new Float32Array(vertices.length),
    tri = [], v1 = [], v2 = [], n = [], len, i, j;

  for (i = 0; i < indices.length; i += 3){
    tri[0] = indices[i]     * 3;
    tri[1] = indices[i + 1] * 3;
    tri[2] = indices[i + 2] * 3;

    for (j = 0; j < 3; ++ j){
      v1[j] = vertices[ tri[1] + j] - vertices[ tri[0] + j];
      v2[j] = vertices[ tri[2] + j] - vertices[ tri[0] + j];
    }
    
    n[0] = v1[1] * v2[2] - v1[2] * v2[1];
    n[1] = v1[2] * v2[0] - v1[0] * v2[2];
    n[2] = v1[0] * v2[1] - v1[1] * v2[0];
    
    len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
    if (len > 1e-10){
      len = 1.0 / len;
      
      n[0] *= len;
      n[1] *= len;
      n[2] *= len;
    }
    
    for (j = 0; j < 3; ++ j){
      smoothNormals[ tri[j] ]    += n[0];
      smoothNormals[ tri[j] + 1] += n[1];
      smoothNormals[ tri[j] + 2] += n[2];
    }
  }

  for (i = 0; i < smoothNormals.length; i += 3){
    len = Math.sqrt(smoothNormals[i] * smoothNormals[i] + 
      smoothNormals[i + 1] * smoothNormals[i + 1] +
      smoothNormals[i + 2] * smoothNormals[i + 2]);

    if(len > 1e-10){
      len = 1.0 / len;

      smoothNormals[i]     *= len;
      smoothNormals[i + 1] *= len;
      smoothNormals[i + 2] *= len;
    }
  }

  return smoothNormals;
};

CTM.makeNormalCoordSys = function(normals, index, basis){
  basis[0] = - normals[index + 1];
  basis[1] = normals[index] - normals[index + 2];
  basis[2] = normals[index + 1];

  var len = Math.sqrt(2.0 * basis[0] * basis[0] + basis[1] * basis[1]);
  if (len > 1e-10){
    len = 1.0 / len;
    
    basis[0] *= len;
    basis[1] *= len;
    basis[2] *= len;
  }

  basis[6] = normals[index];
  basis[7] = normals[index + 1];
  basis[8] = normals[index + 2];

  basis[3] = basis[7] * basis[2] - basis[8] * basis[1];
  basis[4] = basis[8] * basis[0] - basis[6] * basis[2];
  basis[5] = basis[6] * basis[1] - basis[7] * basis[0];
};

CTM.isLittleEndian = (function(){
  var buffer = new ArrayBuffer(2),
      bytes = new Uint8Array(buffer),
      ints = new Uint16Array(buffer);

  bytes[0] = 1;

  return ints[0] === 1;
}());

CTM.InterleavedStream = function(data, count){
  this.data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  this.offset = CTM.isLittleEndian? 3: 0;
  this.count = count * 4;
};

CTM.InterleavedStream.prototype.writeByte = function(value){
  this.data[this.offset] = value;
  
  this.offset += this.count;
  if (this.offset >= this.data.length){
  
    this.offset -= this.data.length - 4;
    if (this.offset >= this.count){
    
      this.offset -= this.count + (CTM.isLittleEndian? 1: -1);
    }
  }
};

CTM.Stream = function(data){
  this.data = data;
  this.offset = 0;
};

CTM.Stream.prototype.TWO_POW_MINUS23 = (function(){
  return Math.pow(2, -23);
}());

CTM.Stream.prototype.TWO_POW_MINUS126 = (function(){
  return Math.pow(2, -126);
}());

CTM.Stream.prototype.readByte = function(){ // MODIFIED BY NICO KEMNITZ - 05.09.2013
  //return this.data.charCodeAt(this.offset ++) & 0xff;
  return this.data[this.offset++];
};

CTM.Stream.prototype.readInt32 = function(){
  var i = this.readByte();
  i |= this.readByte() << 8;
  i |= this.readByte() << 16;
  return i | (this.readByte() << 24);
};

CTM.Stream.prototype.readFloat32 = function(){
  var m = this.readByte();
  m += this.readByte() << 8;

  var b1 = this.readByte();
  var b2 = this.readByte();

  m += (b1 & 0x7f) << 16; 
  var e = ( (b2 & 0x7f) << 1) | ( (b1 & 0x80) >>> 7);
  var s = b2 & 0x80? -1: 1;

  if (e === 255){
    return m !== 0? NaN: s * Infinity;
  }
  if (e > 0){
    return s * (1 + (m * this.TWO_POW_MINUS23) ) * Math.pow(2, e - 127);
  }
  if (m !== 0){
    return s * m * this.TWO_POW_MINUS126;
  }
  return s * 0;
};

CTM.Stream.prototype.readString = function () { // MODIFIED BY NICO KEMNITZ - 05.09.2013
    var len = this.readInt32();

    this.offset += len;

    //return this.data.substr(this.offset - len, len);
    return this.data.subarray(this.offset - len, this.offset);
};

CTM.Stream.prototype.readArrayInt32 = function(array){
  var len = array.length;

  for (var i = 0; i < len; ++ i){
    array[i] = this.readInt32();
  }

  return array;
};

CTM.Stream.prototype.readArrayFloat32 = function(array){
  var len = array.length;

  for (var i = 0; i < len; ++ i){
    array[i] = this.readFloat32();
  }

  return array;
};

if (typeof module !== 'undefined' && module.exports) { module.exports = { CTM: CTM, LZMA: LZMA }; }
