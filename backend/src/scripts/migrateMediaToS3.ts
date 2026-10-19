/* eslint-disable no-console */
import "../bootstrap";
import { promises as fs } from "fs";
import path from "path";

import uploadConfig from "../config/upload";
import {
  existsInS3,
  isSafeFilename,
  saveMedia,
  storageDriver
} from "../libs/storage";

// Copies media saved in backend/public to the S3 bucket. Safe to run more
// than once: files already in the bucket are skipped. Local files are kept;
// delete them yourself after checking the bucket.
//   npm run storage:migrate
const run = async (): Promise<void> => {
  if (storageDriver() !== "s3") {
    console.error("Set STORAGE_DRIVER=s3 and the S3_* variables first.");
    process.exit(1);
  }

  const files = (await fs.readdir(uploadConfig.directory)).filter(
    isSafeFilename
  );
  let copied = 0;
  let skipped = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const filename of files) {
    // eslint-disable-next-line no-await-in-loop
    if (await existsInS3(filename)) {
      skipped += 1;
    } else {
      // eslint-disable-next-line no-await-in-loop
      const data = await fs.readFile(
        path.join(uploadConfig.directory, filename)
      );
      // eslint-disable-next-line no-await-in-loop
      await saveMedia(filename, data);
      copied += 1;
    }
  }

  console.log(`Copied ${copied} file(s), ${skipped} already in the bucket.`);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
