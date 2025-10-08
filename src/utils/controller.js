import SqlError from '../errors/sqlError';
import { notNull } from './utils';

const validateValues = (values) => {
  if (Array.isArray(values)) {
    return values.map((filta) => validateValues(filta));
  }
  if (values === 'true' || values === 'false') {
    return values === 'true';
  }
  return notNull(values) ? values : null;
};

const createFilterObject = (filter) => {
  const [fieldName, fieldValue] = filter.split('=');
  if (fieldName.includes('$in')) {
    const inValues = fieldValue.split(',');
    return {
      name: fieldName.replace('$in', ''),
      filter: {
        type: 'IN',
        values: validateValues(inValues),
      },
    };
  }
  if (fieldName.includes('$gte')) {
    return {
      name: fieldName.replace('$gte', ''),
      filter: {
        type: 'GREATERTHANEQ',
        values: validateValues(fieldValue),
      },
    };
  }
  if (fieldName.includes('$lte')) {
    return {
      name: fieldName.replace('$lte', ''),
      filter: {
        type: 'LESSTHANEQ',
        values: validateValues(fieldValue),
      },
    };
  }
  if (fieldName.includes('$gt')) {
    return {
      name: fieldName.replace('$gt', ''),
      filter: {
        type: 'GREATERTHAN',
        values: validateValues(fieldValue),
      },
    };
  }
  if (fieldName.includes('$lt')) {
    return {
      name: fieldName.replace('$lt', ''),
      filter: {
        type: 'LESSTHAN',
        values: validateValues(fieldValue),
      },
    };
  }
  if (fieldName.includes('$btw')) {
    const betweenValues = fieldValue.split(',');
    if (betweenValues.length !== 2) {
      throw new SqlError('There can only be 2 values for between. i.e. dd-mm-yyyy,dd-mm-yyyy');
    }
    return {
      name: fieldName.replace('$btw', ''),
      filter: {
        type: 'BETWEEN',
        values: validateValues(betweenValues),
      },
    };
  }
  if (fieldName.includes('$ne')) {
    return {
      name: fieldName.replace('$ne', ''),
      filter: {
        type: 'NOTEQ',
        values: validateValues(fieldValue),
      },
    };
  }
  if (fieldName.includes('$eq')) {
    return {
      name: fieldName.replace('$eq', ''),
      filter: {
        type: 'EQ',
        values: validateValues(fieldValue),
      },
    };
  }
  if (fieldName.includes('$up')) {
    return {
      name: fieldName.replace('$up', ''),
      filter: {
        type: 'UPPER',
        values: validateValues(fieldValue),
      },
    };
  }
  return null;
};

const createFilters = (req) => {
  let reqFilters = req.query.filter;

  if (!Array.isArray(reqFilters)) {
    reqFilters = [reqFilters];
  }

  const filters = [];
  let archivedFound = false;
  let countryFound = false;
  reqFilters.forEach((filter) => {
    const filterItem = createFilterObject(filter);
    if (filterItem) {
      filters.push(filterItem);
      if (filterItem.name === 'archived') {
        archivedFound = true;
      }
      if (filterItem.name === 'country_id') {
        countryFound = true;
      }
    }
  });

  if (!archivedFound && req.user) {
    filters.push({
      name: 'archived',
      filter: {
        type: 'EQ',
        values: false,
      },
    });
  }

  if (!countryFound && req.user) {
    filters.push({
      name: 'country_id',
      filter: {
        type: 'EQ',
        values: req.user.country_id,
      },
    });
  }
  return filters;
};

const validSort = (sort) => {
  if (!sort) {
    return false;
  }
  if (sort.includes(' ')) {
    return false;
  }
  if (sort.includes('-')) {
    return false;
  }
  if (sort.split('').filter((char) => Number.isNaN(char)).length > 0) {
    return false;
  }
  return true;
};

/**
 * Handles controller execution and responds to front-end (API Express version).
 * Web socket has a similar handler implementation.
 * @param promise Controller Promise. I.e. getById.
 * @param params A function (req, res, next), all of which are optional
 * that maps our desired controller parameters. I.e. (req) => [req.params.username, ...].
 */
export default (promise, params) => async (req, res, next) => {
  try {
    const boundParams = params ? params(req) : [];

    const options = {
      sort: validSort(req.query.sort) ? req.query.sort : '',
      skip: !Number.isNaN(req.query.skip) ? req.query.skip : undefined,
      limit: !Number.isNaN(req.query.limit) ? req.query.limit : undefined,
    };

    if (!req.query.filter) {
      req.query.filter = '';
    }
    options.filter = createFilters(req);

    if (req.query.search) {
      options.search = req.query.search;
    }

    boundParams.push(options);

    const result = await promise(...boundParams);
    if (result === null) {
      return res.status(200).send({ data: result });
    }
    return res.status(result.status).send(result);
  } catch (err) {
    return next(err);
  }
};
