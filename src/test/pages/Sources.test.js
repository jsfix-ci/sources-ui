import React from 'react';
import thunk from 'redux-thunk';
import { notificationsMiddleware } from '@redhat-cloud-services/frontend-components-notifications';
import { applyReducerHash } from '@redhat-cloud-services/frontend-components-utilities/files/ReducerRegistry';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { PrimaryToolbar } from '@redhat-cloud-services/frontend-components/components/cjs/PrimaryToolbar';
import { act } from 'react-dom/test-utils';
import { Chip, Select, Pagination, Button, Tooltip } from '@patternfly/react-core';
import { MemoryRouter, Link } from 'react-router-dom';
import { AddSourceWizard } from '@redhat-cloud-services/frontend-components-sources/cjs/addSourceWizard';

import SourcesPageOriginal from '../../pages/Sources';
import SourcesEmptyState from '../../components/SourcesTable/SourcesEmptyState';
import SourcesTable from '../../components/SourcesTable/SourcesTable';

import { sourcesDataGraphQl, SOURCE_ALL_APS_ID } from '../__mocks__/sourcesData';
import { sourceTypesData, OPENSHIFT_ID } from '../__mocks__/sourceTypesData';
import { applicationTypesData, CATALOG_APP } from '../__mocks__/applicationTypesData';

import { componentWrapperIntl } from '../../utilities/testsHelpers';

import ReducersProviders, { defaultSourcesState } from '../../redux/sources/reducer';
import * as api from '../../api/entities';
import * as typesApi from '../../api/source_types';
import EmptyStateTable from '../../components/SourcesTable/EmptyStateTable';
import { routes, replaceRouteId } from '../../Routes';
import * as helpers from '../../pages/Sources/helpers';
import UserReducer from '../../redux/user/reducer';
import RedirectNoWriteAccess from '../../components/RedirectNoWriteAccess/RedirectNoWriteAccess';
import * as SourceRemoveModal from '../../components/SourceRemoveModal/SourceRemoveModal';
import * as urlQuery from '../../utilities/urlQuery';
import { PlaceHolderTable, PaginationLoader } from '../../components/SourcesTable/loaders';
import { Table } from '@patternfly/react-table';
import SourcesErrorState from '../../components/SourcesErrorState';
import DataLoader from '../../components/DataLoader';
import TabNavigation from '../../components/TabNavigation';
import CloudCards from '../../components/CloudCards';
import { REDHAT_VENDOR } from '../../utilities/constants';

describe('SourcesPage', () => {
  const middlewares = [thunk, notificationsMiddleware()];
  let initialProps;
  let store;
  let wrapper;

  const SourcesPage = (props) => (
    <React.Fragment>
      <DataLoader />
      <SourcesPageOriginal {...props} />
    </React.Fragment>
  );

  beforeEach(() => {
    initialProps = {};

    api.doLoadEntities = jest.fn().mockImplementation(() => Promise.resolve({ sources: sourcesDataGraphQl }));
    api.doLoadCountOfSources = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ meta: { count: sourcesDataGraphQl.length } }));
    api.doLoadAppTypes = jest.fn().mockImplementation(() => Promise.resolve(applicationTypesData));
    typesApi.doLoadSourceTypes = jest.fn().mockImplementation(() => Promise.resolve(sourceTypesData.data));

    store = createStore(
      combineReducers({
        sources: applyReducerHash(ReducersProviders, defaultSourcesState),
        user: applyReducerHash(UserReducer, { isOrgAdmin: true }),
      }),
      applyMiddleware(...middlewares)
    );

    urlQuery.updateQuery = jest.fn();
    urlQuery.parseQuery = jest.fn();
  });

  it('should fetch sources and source types on component mount', async () => {
    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    expect(api.doLoadEntities).toHaveBeenCalled();
    expect(api.doLoadAppTypes).toHaveBeenCalled();
    expect(typesApi.doLoadSourceTypes).toHaveBeenCalled();

    wrapper.update();

    expect(wrapper.find(TabNavigation)).toHaveLength(1);
    expect(wrapper.find(SourcesEmptyState)).toHaveLength(0);
    expect(wrapper.find(PrimaryToolbar)).toHaveLength(2);
    expect(wrapper.find(CloudCards)).toHaveLength(1);
    expect(wrapper.find(SourcesTable)).toHaveLength(1);
    expect(wrapper.find(Pagination)).toHaveLength(2);
    expect(wrapper.find(PaginationLoader)).toHaveLength(0);
    expect(wrapper.find(PrimaryToolbar).first().props().actionsConfig).toEqual({
      actions: expect.any(Array),
    });
    expect(wrapper.find(PrimaryToolbar).last().props().actionsConfig).toEqual(undefined);
    expect(wrapper.find(RedirectNoWriteAccess)).toHaveLength(0);

    expect(urlQuery.parseQuery.mock.calls).toHaveLength(1);
    expect(urlQuery.updateQuery.mock.calls).toHaveLength(1);
    expect(urlQuery.updateQuery).toHaveBeenCalledWith({
      ...defaultSourcesState,
      loaded: 0,
      appTypesLoaded: true,
      sourceTypesLoaded: true,
      sourceTypes: sourceTypesData.data,
      appTypes: applicationTypesData.data,
      numberOfEntities: sourcesDataGraphQl.length,
      entities: sourcesDataGraphQl,
      paginationClicked: false,
    });
  });

  it('do not show CloudCards on Red Hat page', async () => {
    store = createStore(
      combineReducers({
        sources: applyReducerHash(ReducersProviders, { ...defaultSourcesState, activeVendor: REDHAT_VENDOR }),
        user: applyReducerHash(UserReducer, { isOrgAdmin: true }),
      }),
      applyMiddleware(...middlewares)
    );

    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    wrapper.update();

    expect(wrapper.find(CloudCards)).toHaveLength(0);
  });

  it('renders empty state when there are no Sources', async () => {
    api.doLoadEntities = jest.fn().mockImplementation(() => Promise.resolve({ sources: [] }));
    api.doLoadCountOfSources = jest.fn().mockImplementation(() => Promise.resolve({ meta: { count: 0 } }));

    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    wrapper.update();
    expect(wrapper.find(SourcesEmptyState)).toHaveLength(1);
    expect(wrapper.find(PrimaryToolbar)).toHaveLength(2);
    expect(wrapper.find(SourcesTable)).toHaveLength(1);
  });

  it('renders error state when there is fetching (loadEntities) error', async () => {
    const ERROR_MESSAGE = 'ERROR_MESSAGE';
    api.doLoadEntities = jest.fn().mockImplementation(() => Promise.reject({ detail: ERROR_MESSAGE }));

    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    wrapper.update();
    expect(wrapper.find(SourcesErrorState)).toHaveLength(1);
    expect(wrapper.find(PrimaryToolbar)).toHaveLength(0);
    expect(wrapper.find(SourcesTable)).toHaveLength(0);
  });

  it('renders error state when there is loading (sourceTypes/appTypes) error', async () => {
    const ERROR_MESSAGE = 'ERROR_MESSAGE';
    api.doLoadAppTypes = jest.fn().mockImplementation(() => Promise.reject({ detail: ERROR_MESSAGE }));

    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    wrapper.update();
    expect(wrapper.find(SourcesErrorState)).toHaveLength(1);
    expect(wrapper.find(PrimaryToolbar)).toHaveLength(0);
    expect(wrapper.find(SourcesTable)).toHaveLength(0);
  });

  it('renders table and filtering - loading', async () => {
    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    expect(wrapper.find(SourcesEmptyState)).toHaveLength(0);
    expect(wrapper.find(PrimaryToolbar)).toHaveLength(2);
    expect(wrapper.find(SourcesTable)).toHaveLength(1);
    expect(wrapper.find(PaginationLoader)).toHaveLength(2);
  });

  it('renders table and filtering - loading with paginationClicked: true, do not show paginationLoader', async () => {
    const modifiedState = {
      ...defaultSourcesState,
      loaded: 1,
      paginationClicked: true,
      numberOfEntities: 5,
    };

    store = createStore(
      combineReducers({
        sources: applyReducerHash(ReducersProviders, modifiedState),
        user: applyReducerHash(UserReducer, { isOrgAdmin: true }),
      }),
      applyMiddleware(...middlewares)
    );

    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    expect(wrapper.find(SourcesEmptyState)).toHaveLength(0);
    expect(wrapper.find(PrimaryToolbar)).toHaveLength(2);
    expect(wrapper.find(SourcesTable)).toHaveLength(1);
    expect(wrapper.find(PaginationLoader)).toHaveLength(0);
    expect(wrapper.find(Pagination)).toHaveLength(2);
  });

  it('renders addSourceWizard', async () => {
    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });
    wrapper.update();

    await act(async () => {
      wrapper.find(Link).first().simulate('click', { button: 0 });
    });
    wrapper.update();

    expect(wrapper.find(MemoryRouter).instance().history.location.pathname).toEqual(routes.sourcesNew.path);
    expect(wrapper.find(AddSourceWizard)).toHaveLength(1);
  });

  it('renders and decreased page number if it is too great', async () => {
    store = createStore(
      combineReducers({
        sources: applyReducerHash(ReducersProviders, {
          ...defaultSourcesState,
          pageNumber: 20,
        }),
        user: applyReducerHash(UserReducer, { isOrgAdmin: true }),
      }),
      applyMiddleware(...middlewares)
    );

    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });
    wrapper.update();

    const paginationInput = wrapper.find('.pf-c-pagination__nav-page-select').first().find('input').first();

    expect(paginationInput.props().value).toEqual(1);
  });

  it('closes addSourceWizard', async () => {
    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });
    wrapper.update();

    await act(async () => {
      wrapper.find(Link).first().simulate('click', { button: 0 });
    });
    wrapper.update();

    expect(wrapper.find(RedirectNoWriteAccess)).toHaveLength(1);

    await act(async () => {
      wrapper.find(AddSourceWizard).props().onClose();
    });
    wrapper.update();

    expect(wrapper.find(MemoryRouter).instance().history.location.pathname).toEqual(routes.sources.path);
  });

  it('closes addSourceWizard and redirects to detail when source is created', async () => {
    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });
    wrapper.update();

    await act(async () => {
      wrapper.find(Link).first().simulate('click', { button: 0 });
    });
    wrapper.update();

    expect(wrapper.find(RedirectNoWriteAccess)).toHaveLength(1);

    const SOURCE_ID = '544615';

    await act(async () => {
      wrapper.find(AddSourceWizard).props().onClose(null, { id: SOURCE_ID });
    });
    wrapper.update();

    expect(wrapper.find(MemoryRouter).instance().history.location.pathname).toEqual(
      replaceRouteId(routes.sourcesDetail.path, SOURCE_ID)
    );
  });

  it('afterSuccess addSourceWizard', async () => {
    helpers.afterSuccess = jest.fn();

    const source = { id: '544615', name: 'name of created source' };

    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });
    wrapper.update();

    expect(urlQuery.parseQuery.mock.calls).toHaveLength(1);
    expect(urlQuery.updateQuery.mock.calls).toHaveLength(1);

    await act(async () => {
      wrapper.find(Link).first().simulate('click', { button: 0 });
    });
    wrapper.update();

    expect(urlQuery.parseQuery.mock.calls).toHaveLength(1);
    expect(urlQuery.updateQuery.mock.calls).toHaveLength(2);

    await act(async () => {
      wrapper.find(AddSourceWizard).props().afterSuccess(source);
    });
    wrapper.update();

    expect(helpers.afterSuccess).toHaveBeenCalledWith(expect.any(Function), source);
  });

  it('renders loading state when is loading', async () => {
    await act(async () => {
      wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
    });

    expect(wrapper.find(PlaceHolderTable)).toHaveLength(1);
    expect(wrapper.find(Table)).toHaveLength(1);
    wrapper.update();
    expect(wrapper.find(PlaceHolderTable)).toHaveLength(0);
    expect(wrapper.find(Table)).toHaveLength(1);
  });

  describe('filtering', () => {
    const EMPTY_VALUE = '';
    const SEARCH_TERM = 'Pepa';
    const FILTER_INPUT_INDEX = 0;

    let wrapper;
    const filterInput = (wrapper) => wrapper.find('input').at(FILTER_INPUT_INDEX);

    beforeEach(async () => {
      await act(async () => {
        wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
      });
      wrapper.update();

      await act(async () => {
        filterInput(wrapper).simulate('change', {
          target: { value: SEARCH_TERM },
        });
      });
      wrapper.update();
    });

    it('should call onFilterSelect', (done) => {
      setTimeout(() => {
        expect(store.getState().sources.filterValue).toEqual({
          name: SEARCH_TERM,
        });
        done();
      }, 500);
    });

    it('should call onFilterSelect with type', (done) => {
      setTimeout(() => {
        wrapper.update();
        expect(wrapper.find(Chip)).toHaveLength(1);

        // Switch to source type in conditional filter
        wrapper.find('ConditionalFilter').setState({ stateValue: 1 });
        wrapper.update();

        const checkboxDropdownProps = wrapper.find(Select).last().props();

        // Select openshift
        const EVENT = {};
        checkboxDropdownProps.onSelect(EVENT, OPENSHIFT_ID);
        wrapper.update();

        expect(wrapper.find(Chip)).toHaveLength(2);
        expect(store.getState().sources.filterValue).toEqual({
          name: SEARCH_TERM,
          source_type_id: [OPENSHIFT_ID],
        });
        done();
      }, 500);
    });

    it('should call onFilterSelect with applications', (done) => {
      setTimeout(() => {
        wrapper.update();
        expect(wrapper.find(Chip)).toHaveLength(1);

        // Switch to source type in conditional filter
        wrapper.find('ConditionalFilter').setState({ stateValue: 2 });
        wrapper.update();

        const checkboxDropdownProps = wrapper.find(Select).last().props();

        // Select openshift
        const EVENT = {};
        checkboxDropdownProps.onSelect(EVENT, CATALOG_APP.id);
        wrapper.update();

        expect(wrapper.find(Chip)).toHaveLength(2);
        expect(store.getState().sources.filterValue).toEqual({
          name: SEARCH_TERM,
          applications: [CATALOG_APP.id],
        });
        done();
      }, 500);
    });

    it('filtered value is shown in the input', () => {
      expect(filterInput(wrapper).props().value).toEqual(SEARCH_TERM);
    });

    it('should remove the name badge when clicking on remove icon in chip', (done) => {
      setTimeout(async () => {
        wrapper.update();

        expect(wrapper.find(Chip)).toHaveLength(1);

        const chipButton = wrapper.find(Chip).find(Button);

        await act(async () => chipButton.simulate('click'));
        wrapper.update();

        expect(wrapper.find(Chip)).toHaveLength(0);
        expect(filterInput(wrapper).props().value).toEqual(EMPTY_VALUE);

        done();
      }, 500);
    });

    it('should not remove the name badge when clicking on chip', (done) => {
      setTimeout(async () => {
        wrapper.update();

        expect(wrapper.find(Chip)).toHaveLength(1);

        await act(async () => wrapper.find(Chip).simulate('click'));
        wrapper.update();

        expect(wrapper.find(Chip)).toHaveLength(1);
        expect(filterInput(wrapper).props().value).toEqual(SEARCH_TERM);

        done();
      }, 500);
    });

    it('should remove the name badge when clicking on Clear filters button', (done) => {
      const clearFillterButtonSelector = '.pf-m-link';

      setTimeout(async () => {
        wrapper.update();

        expect(wrapper.find(clearFillterButtonSelector)).toHaveLength(1);

        await act(async () => wrapper.find(clearFillterButtonSelector).simulate('click'));
        wrapper.update();

        expect(wrapper.find(clearFillterButtonSelector)).toHaveLength(0);
        done();
      }, 500);
    });

    it('renders emptyStateTable when no entities found', (done) => {
      setTimeout(async () => {
        wrapper.update();

        api.doLoadEntities = jest.fn().mockImplementation(() => Promise.resolve({ sources: [] }));
        api.doLoadCountOfSources = jest.fn().mockImplementation(() => Promise.resolve({ meta: { count: 0 } }));

        const totalNonsense = '122#$@#%#^$#@!^$#^$#^546454abcerd';

        await act(async () => {
          filterInput(wrapper).simulate('change', {
            target: { value: totalNonsense },
          });
        });

        setTimeout(() => {
          wrapper.update();
          expect(store.getState().sources.filterValue).toEqual({
            name: totalNonsense,
          });
          expect(store.getState().sources.numberOfEntities).toEqual(0);
          expect(wrapper.find(EmptyStateTable)).toHaveLength(1);
          expect(wrapper.find(Pagination)).toHaveLength(0);
          done();
        }, 500);
      }, 500);
    });

    it('show empty state table after clicking on clears all filter in empty table state', (done) => {
      setTimeout(async () => {
        wrapper.update();

        api.doLoadEntities = jest.fn().mockImplementation(() => Promise.resolve({ sources: [] }));
        api.doLoadCountOfSources = jest.fn().mockImplementation(() => Promise.resolve({ meta: { count: 0 } }));

        const totalNonsense = '122#$@#%#^$#@!^$#^$#^546454abcerd';

        await act(async () => {
          filterInput(wrapper).simulate('change', {
            target: { value: totalNonsense },
          });
        });

        setTimeout(async () => {
          wrapper.update();

          expect(filterInput(wrapper).props().value).toEqual(totalNonsense);

          await act(async () => {
            wrapper.find(Button).last().simulate('click');
          });
          wrapper.update();

          expect(wrapper.find(SourcesEmptyState)).toHaveLength(1);
          done();
        }, 500);
      }, 500);
    });

    it('clears filter value in the name input when clicking on clears all filter in empty table state and show table', (done) => {
      setTimeout(async () => {
        wrapper.update();

        api.doLoadEntities = jest.fn().mockImplementation(() => Promise.resolve({ sources: [] }));
        api.doLoadCountOfSources = jest.fn().mockImplementation(() => Promise.resolve({ meta: { count: 0 } }));

        const totalNonsense = '122#$@#%#^$#@!^$#^$#^546454abcerd';

        await act(async () => {
          filterInput(wrapper).simulate('change', {
            target: { value: totalNonsense },
          });
        });

        setTimeout(async () => {
          wrapper.update();

          expect(filterInput(wrapper).props().value).toEqual(totalNonsense);

          api.doLoadEntities.mockImplementation(() => Promise.resolve({ sources: sourcesDataGraphQl }));
          api.doLoadCountOfSources.mockImplementation(() => Promise.resolve({ meta: { count: sourcesDataGraphQl.length } }));

          await act(async () => {
            wrapper.find(Button).last().simulate('click');
          });
          wrapper.update();

          expect(filterInput(wrapper).props().value).toEqual(EMPTY_VALUE);
          done();
        }, 500);
      }, 500);
    });
  });

  describe('not org admin', () => {
    beforeEach(async () => {
      store = createStore(
        combineReducers({
          sources: applyReducerHash(ReducersProviders, defaultSourcesState),
          user: applyReducerHash(UserReducer, { isOrgAdmin: false }),
        }),
        applyMiddleware(...middlewares)
      );

      await act(async () => {
        wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store));
      });
      wrapper.update();
    });

    it('should fetch sources and source types on component mount', async () => {
      expect(api.doLoadEntities).toHaveBeenCalled();
      expect(api.doLoadAppTypes).toHaveBeenCalled();
      expect(typesApi.doLoadSourceTypes).toHaveBeenCalled();

      expect(wrapper.find(SourcesEmptyState)).toHaveLength(0);
      expect(wrapper.find(PrimaryToolbar)).toHaveLength(2);
      expect(wrapper.find(SourcesTable)).toHaveLength(1);
      expect(wrapper.find(Pagination)).toHaveLength(2);
      expect(wrapper.find(PaginationLoader)).toHaveLength(0);
      expect(wrapper.find('#addSourceButton').first().props().isDisabled).toEqual(true);
      expect(wrapper.find(PrimaryToolbar).find(Tooltip)).toHaveLength(1);
      expect(wrapper.find(RedirectNoWriteAccess)).toHaveLength(0);
    });
  });

  describe('routes', () => {
    let initialEntry;

    const wasRedirectedToRoot = (wrapper) =>
      wrapper.find(MemoryRouter).instance().history.location.pathname === routes.sources.path;

    it('renders remove', async () => {
      SourceRemoveModal.default = () => <h1>remove modal mock</h1>;
      initialEntry = [replaceRouteId(routes.sourcesRemove.path, SOURCE_ALL_APS_ID)];

      await act(async () => {
        wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store, initialEntry));
      });
      wrapper.update();

      expect(wrapper.find(RedirectNoWriteAccess)).toHaveLength(1);
      expect(wrapper.find(SourceRemoveModal.default)).toHaveLength(1);
    });

    describe('id not found, redirect back to sources', () => {
      const NONSENSE_ID = '&88{}#558';

      beforeEach(() => {
        api.doLoadSource = jest.fn().mockImplementation(() => Promise.resolve({ sources: [] }));
      });

      it('when remove', async () => {
        SourceRemoveModal.default = () => <h1>remove modal mock</h1>;
        initialEntry = [replaceRouteId(routes.sourcesRemove.path, NONSENSE_ID)];

        await act(async () => {
          wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store, initialEntry));
        });
        wrapper.update();

        expect(wrapper.find(RedirectNoWriteAccess)).toHaveLength(0);
        expect(wrapper.find(SourceRemoveModal.default)).toHaveLength(0);
        expect(wasRedirectedToRoot(wrapper)).toEqual(true);
      });
    });

    describe('not org admin, redirect back to sources', () => {
      beforeEach(() => {
        store = createStore(
          combineReducers({
            sources: applyReducerHash(ReducersProviders, defaultSourcesState),
            user: applyReducerHash(UserReducer, { isOrgAdmin: false }),
          }),
          applyMiddleware(...middlewares)
        );
      });

      it('when remove', async () => {
        SourceRemoveModal.default = () => <h1>remove modal mock</h1>;
        initialEntry = [replaceRouteId(routes.sourcesRemove.path, SOURCE_ALL_APS_ID)];

        await act(async () => {
          wrapper = mount(componentWrapperIntl(<SourcesPage {...initialProps} />, store, initialEntry));
        });
        wrapper.update();

        expect(wrapper.find(SourceRemoveModal.default)).toHaveLength(0);
        expect(wasRedirectedToRoot(wrapper)).toEqual(true);
      });
    });
  });
});
