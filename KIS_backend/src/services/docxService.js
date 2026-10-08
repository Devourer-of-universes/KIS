const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const mammoth = require('mammoth');

/**
 * Извлечь все плейсхолдеры вида {Имя} или {Имя.Подполе} из .docx
 * @param {string} filePath - путь к .docx
 * @returns {Promise<string[]>} - массив уникальных плейсхолдеров
 */
async function extractPlaceholders(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'binary');
        const zip = new PizZip(content);
        
        const documentXml = zip.files['word/document.xml'];
        if (!documentXml) {
            throw new Error('Некорректный .docx-файл');
        }
        
        const xmlContent = documentXml.asText();
        
        // 1. Собираем весь текст без XML-тегов (только содержимое <w:t>)
        const textParts = [];
        const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let match;
        while ((match = textRegex.exec(xmlContent)) !== null) {
            textParts.push(match[1]);
        }
        
        // 2. Склеиваем в один текст, декодируем XML-entities
        let fullText = textParts.join('');
        fullText = fullText
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        
        // 3. Теперь ищем {…} в чистом тексте
        const matches = fullText.match(/\{[^{}]+\}/g) || [];
        
        // 4. Чистим и убираем дубликаты
        const placeholders = [...new Set(
            matches
                .map(m => m.slice(1, -1).trim())
                // отфильтровываем мусор с XML-тегами
                .filter(name => name.length > 0 && name.length < 100)
                .filter(name => !/[<>]/.test(name))  // не должно быть < или >
                .filter(name => !/^w:/.test(name))   // не должно быть w:...
                .filter(name => !/[a-zA-Z]+="/.test(name)) // не должно быть атрибутов
        )];
        
        return placeholders;
    } catch (error) {
        console.error('Extract placeholders error:', error);
        throw new Error('Не удалось извлечь плейсхолдеры: ' + error.message);
    }
}

/**
 * Проверить, что .docx является валидным шаблоном
 */
async function validateDocx(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        // Пытаемся отрендерить с пустыми данными — если ок, значит шаблон валидный
        doc.render({});
        return { valid: true };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Конвертировать .docx в HTML (для превью)
 */
async function docxToHtml(filePath) {
    try {
        const result = await mammoth.convertToHtml({ path: filePath });
        return {
            html: result.value,
            messages: result.messages
        };
    } catch (error) {
        console.error('Docx to HTML error:', error);
        throw new Error('Не удалось конвертировать .docx в HTML');
    }
}

/**
 * Сгенерировать .docx с подстановкой данных
 * @param {string} templatePath - путь к шаблону .docx
 * @param {Object} data - объект с данными { "Имя": "значение", ... }
 * @param {string} outputPath - куда сохранить
 */
async function generateDocx(templatePath, data, outputPath) {
    try {
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => '' // пустая строка вместо undefined
        });
        
        doc.render(data);
        
        const buf = doc.getZip().generate({ 
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });
        
        // Создаём папку, если её нет
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, buf);
        
        return { success: true, outputPath };
    } catch (error) {
        console.error('Generate docx error:', error);
        throw new Error('Не удалось сгенерировать .docx: ' + error.message);
    }
}

module.exports = {
    extractPlaceholders,
    validateDocx,
    docxToHtml,
    generateDocx
};