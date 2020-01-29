import { getDevStore, getProdStore } from '../../Utilities/store';
import { defaultSourcesState } from '../../redux/sources/reducer';
import { defaultUserState } from '../../redux/user/reducer';

describe('store creator', () => {
    const EXPECTED_DEFAULT_STATE = {
        notifications: [],
        sources: defaultSourcesState,
        user: defaultUserState
    };

    it('creates DevStore', () => {
        const store = getDevStore();

        expect(store.getState()).toEqual(EXPECTED_DEFAULT_STATE);
    });

    it('creates ProdStore', () => {
        const store = getProdStore();

        expect(store.getState()).toEqual(EXPECTED_DEFAULT_STATE);
    });
});
