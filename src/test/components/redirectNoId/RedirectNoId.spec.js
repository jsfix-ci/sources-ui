import { Route, MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';

import { componentWrapperIntl } from '../../../Utilities/testsHelpers';
import RedirectNoId from '../../../components/RedirectNoId/RedirectNoId';
import * as actions from '../../../redux/actions/providers';

describe('RedirectNoId', () => {
    let initialStore;
    let initialEntry;
    let mockStore;

    const wasRedirectedToRoot = (wrapper) => wrapper.find(MemoryRouter).instance().history.location.pathname === '/';

    beforeEach(() => {
        initialEntry = ['/remove/1'];

        mockStore = configureStore();
    });

    it('Renders null if not loaded', () => {
        initialStore = mockStore({
            providers: { loaded: false, appTypesLoaded: true, sourceTypesLoaded: true }
        });

        const wrapper = mount(componentWrapperIntl(
            <Route path="/remove/:id" render={ (...args) => <RedirectNoId { ...args } /> } />,
            initialStore,
            initialEntry
        ));

        expect(wrapper.html()).toEqual('');
    });

    it('Renders redirect and creates message if loaded', () => {
        actions.addMessage = jest.fn().mockImplementation(() => ({ type: 'ADD_MESSAGE' }));

        initialStore = mockStore({
            providers: { loaded: true, appTypesLoaded: true, sourceTypesLoaded: true }
        });

        const wrapper = mount(componentWrapperIntl(
            <Route path="/remove/:id" render={ (...args) => <RedirectNoId { ...args } /> } />,
            initialStore,
            initialEntry
        ));

        expect(actions.addMessage).toHaveBeenCalled();

        expect(wasRedirectedToRoot(wrapper)).toEqual(true);
    });
});