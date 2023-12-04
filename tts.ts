import { getAudioBase64 } from "google-tts-api";
import fs from "fs";
import Stream from "stream";

interface Option {
  lang?: string;
  slow?: boolean;
  host?: string;
  timeout?: number;
}

const option: Option = {
  lang: "en",
  slow: false,
  host: "https://translate.google.com",
  timeout: 10000,
};

function base64toBinaryStream(base64Text: string) {
  // Convert base64 stream to binary stream
  const audioBinaryStream = new Stream.Readable();
  audioBinaryStream.push(Buffer.from(base64Text, "base64"));

  // Indicate end of stream
  audioBinaryStream.push(null);

  return audioBinaryStream;
}

function downloadFromInfoCallback(stream: Stream.PassThrough, text: string) {
  getAudioBase64(text, option)
    .then((base64Audio) => base64toBinaryStream(base64Audio))
    .then((audioStream) => audioStream.pipe(stream))
    .catch(console.error);
}

export function getVoiceStream(text: string) {
  const stream = new Stream.PassThrough();
  downloadFromInfoCallback(stream, text);
  return stream;
}

export function saveToFile(filePath: string, text: string) {
  const stream = new Stream.PassThrough();
  const writeStream = fs.createWriteStream(filePath);

  downloadFromInfoCallback(stream, text);

  stream.pipe(writeStream);
  stream.on("end", () => writeStream.close());
}
