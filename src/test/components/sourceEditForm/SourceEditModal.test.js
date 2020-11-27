import React from 'react';
import { mount } from 'enzyme';
import { Route } from 'react-router-dom';
import { notificationsMiddleware } from '@redhat-cloud-services/frontend-components-notifications';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { act } from 'react-dom/test-utils';
import { Spinner } from '@patternfly/react-core/dist/js/components/Spinner';

import { componentWrapperIntl } from '../../../utilities/testsHelpers';
import SourceEditModal from '../../../components/SourceEditForm/SourceEditModal';
import { routes, replaceRouteId } from '../../../Routes';
import { applicationTypesData, CATALOG_APP, COSTMANAGEMENT_APP } from '../../__mocks__/applicationTypesData';
import { sourceTypesData, ANSIBLE_TOWER_ID } from '../../__mocks__/sourceTypesData';
import { sourcesDataGraphQl } from '../../__mocks__/sourcesData';
import { Button, FormGroup, Form, Alert, EmptyState, TextInput } from '@patternfly/react-core';
import * as editApi from '../../../api/doLoadSourceForEdit';
import * as submit from '../../../components/SourceEditForm/onSubmit';
import reducer from '../../../components/SourceEditForm/reducer';

import SubmittingModal from '../../../components/SourceEditForm/SubmittingModal';
import EditAlert from '../../../components/SourceEditForm/parser/EditAlert';
import TimeoutedModal from '../../../components/SourceEditForm/TimeoutedModal';
import ErroredModal from '../../../components/SourceEditForm/ErroredModal';
import SourcesFormRenderer from '../../../utilities/SourcesFormRenderer';
import { Switch } from '@data-driven-forms/pf4-component-mapper';

jest.mock('@redhat-cloud-services/frontend-components-sources/cjs/SourceAddSchema', () => ({
  __esModule: true,
  asyncValidatorDebounced: jest.fn(),
}));

describe('SourceEditModal', () => {
  let store;
  let initialEntry;
  let mockStore;
  let wrapper;

  const middlewares = [thunk, notificationsMiddleware()];

  const BUTTONS = ['submit', 'reset'];

  beforeEach(async () => {
    initialEntry = [replaceRouteId(routes.sourcesDetail.path, '14')];
    mockStore = configureStore(middlewares);
    store = mockStore({
      sources: {
        entities: [
          {
            id: '14',
            source_type_id: ANSIBLE_TOWER_ID,
            applications: [
              {
                id: '123',
                authentications: [{ id: '343' }],
              },
            ],
          },
        ],
        appTypes: applicationTypesData.data,
        sourceTypes: sourceTypesData.data,
        appTypesLoaded: true,
        sourceTypesLoaded: true,
      },
    });

    editApi.doLoadSourceForEdit = jest.fn().mockImplementation(() =>
      Promise.resolve({
        source: {
          name: 'Name',
          source_type_id: ANSIBLE_TOWER_ID,
          applications: [
            {
              id: '123',
              application_type_id: CATALOG_APP.id,
              authentications: [{ id: '343' }],
            },
          ],
          endpoints: [{ id: '10953' }],
        },
        applications: [
          {
            application_type_id: CATALOG_APP.id,
            id: '123',
            authentications: [{ type: 'username_password', username: '123', id: '343' }],
          },
        ],
        endpoints: [
          {
            certificate_authority: 'sadas',
            default: true,
            host: 'myopenshiftcluster.mycompany.com',
            id: '10953',
            path: '/',
            role: 'ansible',
            scheme: 'https',
            verify_ssl: true,
          },
        ],
        authentications: [],
      })
    );

    await act(async () => {
      wrapper = mount(
        componentWrapperIntl(
          <Route path={routes.sourcesDetail.path} render={(...args) => <SourceEditModal {...args} />} />,
          store,
          initialEntry
        )
      );
    });
    wrapper.update();
  });

  it('renders correctly', () => {
    expect(wrapper.find(SourcesFormRenderer)).toHaveLength(1);
    expect(wrapper.find(TextInput)).toHaveLength(4);

    expect(wrapper.find(TextInput).at(0).props().name).toEqual('endpoint.role');
    expect(wrapper.find(TextInput).at(1).props().name).toEqual('url');
    expect(wrapper.find(TextInput).at(2).props().name).toEqual('endpoint.certificate_authority');
    expect(wrapper.find(TextInput).at(3).props().name).toEqual('endpoint.receptor_node');

    expect(wrapper.find(Switch)).toHaveLength(2);
    expect(wrapper.find(Button)).toHaveLength(BUTTONS.length);
  });

  describe('submit', () => {
    const NEW_CA = 'new name';

    const VALUES = expect.objectContaining({
      endpoint: expect.objectContaining({
        certificate_authority: NEW_CA,
      }),
    });
    const EDITING = {
      'endpoint.certificate_authority': true,
    };
    const DISPATCH = expect.any(Function);
    const SET_STATE = expect.any(Function);
    const SOURCE = expect.any(Object);
    const INTL = expect.objectContaining({
      formatMessage: expect.any(Function),
    });
    const HAS_COST_MANAGEMENT = false;

    beforeEach(async () => {
      const nameFormGroup = wrapper.find(FormGroup).first();
      await act(async () => {
        nameFormGroup.simulate('click');
      });
      wrapper.update();

      await act(async () => {
        wrapper.find(TextInput).at(2).find('input').instance().value = NEW_CA;
        wrapper.find(TextInput).at(2).simulate('change');
      });
      wrapper.update();
    });

    it('calls onSubmit with values and editing object', async () => {
      jest.useFakeTimers();

      const message = {
        title: 'some title',
        variant: 'danger',
        description: 'some description',
      };

      submit.onSubmit = jest.fn().mockImplementation((values, editing, _dispatch, source, _intl, setState) => {
        setState({ type: 'submit', values, editing });

        setTimeout(() => {
          setState({ type: 'submitFinished', source, message });
        }, 1000);
      });

      const form = wrapper.find(Form);

      expect(wrapper.find(SubmittingModal)).toHaveLength(0);

      await act(async () => {
        form.simulate('submit');
      });
      wrapper.update();

      expect(wrapper.find(SubmittingModal)).toHaveLength(1);

      await act(async () => {
        jest.runAllTimers();
      });
      wrapper.update();

      expect(wrapper.find(SubmittingModal)).toHaveLength(0);
      expect(wrapper.find(EditAlert)).toHaveLength(1);

      expect(wrapper.find(EditAlert).find(Alert).props().title).toEqual(message.title);
      expect(wrapper.find(EditAlert).find(Alert).props().variant).toEqual(message.variant);
      expect(wrapper.find(EditAlert).find(Alert).props().children).toEqual(message.description);

      expect(submit.onSubmit).toHaveBeenCalledWith(VALUES, EDITING, DISPATCH, SOURCE, INTL, SET_STATE, HAS_COST_MANAGEMENT);
    });

    it('calls onSubmit - timeout', async () => {
      jest.useFakeTimers();

      submit.onSubmit = jest.fn().mockImplementation((values, editing, _dispatch, source, _intl, setState) => {
        setState({ type: 'submit', values, editing });

        setTimeout(() => {
          setState({ type: 'submitTimetouted' });
        }, 1000);
      });

      const form = wrapper.find(Form);

      expect(wrapper.find(SubmittingModal)).toHaveLength(0);

      await act(async () => {
        form.simulate('submit');
      });
      wrapper.update();

      expect(wrapper.find(SubmittingModal)).toHaveLength(1);

      await act(async () => {
        jest.runAllTimers();
      });
      wrapper.update();

      expect(wrapper.find(TimeoutedModal)).toHaveLength(1);

      expect(submit.onSubmit).toHaveBeenCalledWith(VALUES, EDITING, DISPATCH, SOURCE, INTL, SET_STATE, HAS_COST_MANAGEMENT);
    });

    it('calls onSubmit - server error', async () => {
      jest.useFakeTimers();

      submit.onSubmit = jest.fn().mockImplementation((values, editing, _dispatch, source, _intl, setState) => {
        setState({ type: 'submit', values, editing });

        setTimeout(() => {
          setState({ type: 'submitFailed' });
        }, 1000);
      });

      const form = wrapper.find(Form);

      expect(wrapper.find(SubmittingModal)).toHaveLength(0);

      await act(async () => {
        form.simulate('submit');
      });
      wrapper.update();

      expect(wrapper.find(SubmittingModal)).toHaveLength(1);

      await act(async () => {
        jest.runAllTimers();
      });
      wrapper.update();

      expect(wrapper.find(ErroredModal)).toHaveLength(1);

      expect(submit.onSubmit).toHaveBeenCalledWith(VALUES, EDITING, DISPATCH, SOURCE, INTL, SET_STATE, HAS_COST_MANAGEMENT);

      submit.onSubmit.mockReset();

      // try again via retry button
      await act(async () => {
        wrapper.find(ErroredModal).find(EmptyState).find(Button).simulate('click');
      });
      wrapper.update();

      expect(submit.onSubmit).toHaveBeenCalledWith(VALUES, EDITING, DISPATCH, SOURCE, INTL, SET_STATE, HAS_COST_MANAGEMENT);
    });
  });

  it('renders loading modal', async () => {
    store = mockStore({
      sources: {
        entities: sourcesDataGraphQl,
        appTypes: applicationTypesData.data,
        sourceTypes: sourceTypesData.data,
        appTypesLoaded: false,
        sourceTypesLoaded: false,
      },
    });

    await act(async () => {
      wrapper = mount(
        componentWrapperIntl(
          <Route path={routes.sourcesDetail.path} render={(...args) => <SourceEditModal {...args} />} />,
          store,
          initialEntry
        )
      );
    });
    wrapper.update();

    expect(wrapper.find(Spinner)).toHaveLength(1);
  });

  it('do not load cost management values', async () => {
    editApi.doLoadSourceForEdit.mockClear();

    const source = { id: '14', applications: [] };

    store = mockStore({
      sources: {
        entities: [source],
        appTypes: applicationTypesData.data,
        sourceTypes: sourceTypesData.data,
        appTypesLoaded: true,
        sourceTypesLoaded: true,
      },
    });

    await act(async () => {
      wrapper = mount(
        componentWrapperIntl(
          <Route path={routes.sourcesDetail.path} render={(...args) => <SourceEditModal {...args} />} />,
          store,
          initialEntry
        )
      );
    });
    wrapper.update();

    expect(editApi.doLoadSourceForEdit).toHaveBeenCalledWith(source, false);
  });

  it('do load cost management values', async () => {
    editApi.doLoadSourceForEdit.mockClear();

    const source = { id: '14', applications: [{ application_type_id: COSTMANAGEMENT_APP.id }] };

    store = mockStore({
      sources: {
        entities: [source],
        appTypes: applicationTypesData.data,
        sourceTypes: sourceTypesData.data,
        appTypesLoaded: true,
        sourceTypesLoaded: true,
      },
    });

    await act(async () => {
      wrapper = mount(
        componentWrapperIntl(
          <Route path={routes.sourcesDetail.path} render={(...args) => <SourceEditModal {...args} />} />,
          store,
          initialEntry
        )
      );
    });
    wrapper.update();

    expect(editApi.doLoadSourceForEdit).toHaveBeenCalledWith(source, true);
  });

  describe('reducer', () => {
    it('returns default', () => {
      const state = {
        bla: 'blah',
      };
      expect(reducer(state, {})).toEqual(state);
    });
  });
});
