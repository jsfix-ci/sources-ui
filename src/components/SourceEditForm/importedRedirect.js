import { paths } from '../../Routes';
import { addMessage } from '../../redux/actions/providers';

export const redirectWhenImported = (dispatch, intl, history, name) => {
    dispatch(addMessage(
        intl.formatMessage({
            id: 'sources.importSourceCannotEdited',
            defaultMessage: 'Source { name } is imported.'
        }, { name }),
        'danger',
        intl.formatMessage({
            id: 'sources.importedSourcesCannotEdited',
            defaultMessage: 'Imported sources cannot be edited.'
        }),
    ));
    history.push(paths.sources);
};