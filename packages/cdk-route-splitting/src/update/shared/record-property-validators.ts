import { Logger } from '@daysmart/aws-lambda-logger';
import { HttpError } from './http-error';
import { UrlSegment } from './url-segment.enum';

const validKeyList: string[] = Object.keys(UrlSegment);

export const validateKey = (key: string): void => {
    if (!validKeyList.includes(key)) {
        throw new HttpError(400, `Field key is invalid. Valid values are: ${validKeyList.join(', ')}`);
    }
};

export const validateValue = (value: string): void => {
    if (!value?.length) {
        throw new HttpError(400, 'Field value is required.');
    }
};

export const validatePriority = (priority: number): void => {
    if (priority < 0 || (!priority && priority !== 0)) {
        throw new HttpError(400, 'Field priority must be greater than or equal to 0.');
    }
};

export const validateOrigin = (origin: string, logger: Logger): void => {
    if (!origin?.length || !isValidUrl(origin, logger)) {
        throw new HttpError(400, 'Field origin must be a valid url.');
    }
};

const isValidUrl = (url: string, logger: Logger) => {
    try {
        new URL(url);
    } catch (e) {
        logger.debug('Invalid Url Reason', { error: e });
        return false;
    }
    return true;
};
