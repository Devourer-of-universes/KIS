const Joi = require('joi');

// Валидация регистрации
const validateRegistration = (data) => {
    const schema = Joi.object({
        username: Joi.string().min(3).max(50).required(),
        surname: Joi.string().min(2).max(50).required(),
        name: Joi.string().min(2).max(50).required(),
        patronymic: Joi.string().max(50).allow('', null),
        birthday: Joi.date().required(),
        postId: Joi.number().integer().required(),
        departmentId: Joi.number().integer().required(),
        email: Joi.string().email().required(),
        telNum: Joi.string().pattern(/^\+?[0-9]{10,15}$/).required(),
        password: Joi.string().min(6).required(),
        roleId: Joi.number().integer().default(2)
    });
    return schema.validate(data);
};

// Валидация логина
const validateLogin = (data) => {
    const schema = Joi.object({
        emailOrUsername: Joi.string().required(),
        password: Joi.string().required()
    });
    return schema.validate(data);
};

// Валидация создания чата
const validateCreateChat = (data) => {
    const schema = Joi.object({
        userIds: Joi.array().items(Joi.number()).min(1).required(),
        name: Joi.string().max(100).optional(),
        isGroup: Joi.boolean().default(false)
    });
    return schema.validate(data);
};

// Валидация сообщения
const validateMessage = (data) => {
    const schema = Joi.object({
        content: Joi.string().max(5000).required(),
        attachments: Joi.array().optional()
    });
    return schema.validate(data);
};

// Валидация жалобы
const validateReport = (data) => {
    const schema = Joi.object({
        reason: Joi.string().min(5).max(500).required()
    });
    return schema.validate(data);
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateCreateChat,
    validateMessage,
    validateReport
};