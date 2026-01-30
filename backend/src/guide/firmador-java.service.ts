import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

@Injectable()
export class FirmadorJavaService {
  private readonly JAR_PATH = join(
    process.cwd(),
    'firma-ubl',
    'firma-ubl-1.0-SNAPSHOT-jar-with-dependencies.jar',
  );

  async firmarXmlConJava(xmlString: string): Promise<string> {
    const tempId = randomUUID();
    const tempDir = join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const inputPath = join(tempDir, `${tempId}-entrada.xml`);
    const outputPath = join(tempDir, `${tempId}-firmado.xml`);

    // Escribir XML de entrada
    // Preserve ISO-8859-1 bytes because the XML declaration uses that encoding.
    fs.writeFileSync(inputPath, xmlString, 'latin1');

    // Ejecutar el .jar
    await execFileAsync('java', ['-jar', this.JAR_PATH, inputPath, outputPath]);

    if (!fs.existsSync(outputPath)) {
      throw new Error('❌ No se generó el XML firmado desde el .jar');
    }

    const signedXml = fs.readFileSync(outputPath, 'latin1');

    // Limpieza opcional
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    return signedXml;
  }
}
