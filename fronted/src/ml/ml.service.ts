import { Injectable } from '@nestjs/common';
import { PythonShell, Options } from 'python-shell';

@Injectable()
export class MLService {
    async predict(input: string): Promise<{ quantity: number; value: number }> {
      const options: Options = {
        mode: 'text',
        pythonOptions: ['-u'], // Unbuffered output
        scriptPath: './src/ml', // Ruta relativa al script de Python
        args: [input], // Pasar el texto como argumento
      };
  
      try {
        const results = await PythonShell.run('predict.py', options); // Usar promesa
        const [quantity, value] = results.map(Number); // Convertir los resultados a números
        return { quantity, value };
      } catch (err) {
        console.error('Error ejecutando el script de Python:', err);
        throw new Error('Error al ejecutar el modelo de Machine Learning');
      }
    }
  }