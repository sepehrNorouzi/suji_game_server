import dotenv from 'dotenv';
const env_mode = process.env.NODE_ENV === 'production' ? 'production' : 'developement';
dotenv.config({
    path: `../../.env.${env_mode}`
})

class RedisConfig {

    redis_precense_config() {

        let config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            db: parseInt(process.env.REDIS_PRECENSE_DB) || 0,
            password: ''
        }
        if(process.env.REDIS_USE_PASSWORD) {
            config = {
                ...config,
                password: process.env.REDIS_PASSWORD
            }
        }
        else {
            delete config.password;
        }
        return config
    }

    redis_driver_config() {

        let config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT)|| 6379,
            db: parseInt(process.env.REDIS_DRIVER_DB) || 0,
            password: ''
        }
        if(process.env.REDIS_USE_PASSWORD) {
            config = {
                ...config,
                password: process.env.REDIS_PASSWORD
            }
        }
        else {
            delete config.password;
        }
        return config
    }
}

export default new RedisConfig();
