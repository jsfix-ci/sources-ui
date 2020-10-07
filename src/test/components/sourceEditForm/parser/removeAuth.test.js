import thunk from 'redux-thunk';
import { mount } from 'enzyme';
import { notificationsMiddleware } from '@redhat-cloud-services/frontend-components-notifications';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { Button, Text, Modal } from '@patternfly/react-core';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon';

import RemoveAuth from '../../../../components/SourceEditForm/parser/RemoveAuth';
import { componentWrapperIntl } from '../../../../utilities/testsHelpers';
import sourceEditContext from '../../../../components/SourceEditForm/sourceEditContext';
import * as api from '../../../../api/entities';
import * as actions from '../../../../redux/sources/actions';

describe('RemoveAuth', () => {
  let initialProps;
  let setState;
  let source;
  let sourceType;

  const middlewares = [thunk, notificationsMiddleware()];
  let mockStore;
  let store;

  beforeEach(() => {
    initialProps = {
      authId: 'authid',
    };

    source = {
      authentications: [{ id: 'authid', authtype: 'arn' }],
    };
    sourceType = {
      schema: {
        authentication: [
          {
            type: 'arn',
            name: 'ARN',
          },
        ],
      },
    };

    setState = jest.fn();
    mockStore = configureStore(middlewares);
    store = mockStore();
  });

  it('renders correctly', () => {
    const wrapper = mount(
      componentWrapperIntl(
        <sourceEditContext.Provider value={{ setState, source, sourceType }}>
          <RemoveAuth {...initialProps} />
        </sourceEditContext.Provider>
      ),
      store
    );

    expect(wrapper.find(Modal)).toHaveLength(1);
    expect(wrapper.find(Modal).props()['aria-label']).toEqual('Remove authentication?');
    expect(wrapper.find(ExclamationTriangleIcon)).toHaveLength(1);
    expect(wrapper.find(Button)).toHaveLength(3);
    expect(wrapper.find(Text).text()).toEqual('This action will permanently remove ARN from this source.');
  });

  it('calls submit succesfuly', async () => {
    api.doDeleteAuthentication = jest.fn().mockImplementation(() => Promise.resolve('OK'));
    actions.addMessage = jest.fn().mockImplementation(() => ({ type: 'addmessage' }));

    const wrapper = mount(
      componentWrapperIntl(
        <sourceEditContext.Provider value={{ setState, source, sourceType }}>
          <RemoveAuth {...initialProps} />
        </sourceEditContext.Provider>
      ),
      store
    );

    expect(api.doDeleteAuthentication).not.toHaveBeenCalled();

    await act(async () => {
      wrapper.find(Button).at(1).simulate('click');
    });

    expect(api.doDeleteAuthentication).toHaveBeenCalledWith('authid');
    expect(setState).toHaveBeenCalledWith({
      type: 'removeAuthFulfill',
      authId: 'authid',
    });
    expect(actions.addMessage).toHaveBeenCalledWith('Authentication was deleted successfully.', 'success');
  });

  it('calls submit unsuccesfuly', async () => {
    api.doDeleteAuthentication = jest.fn().mockImplementation(() => Promise.reject('Some error'));
    actions.addMessage = jest.fn().mockImplementation(() => ({ type: 'addmessage' }));

    const wrapper = mount(
      componentWrapperIntl(
        <sourceEditContext.Provider value={{ setState, source, sourceType }}>
          <RemoveAuth {...initialProps} />
        </sourceEditContext.Provider>
      ),
      store
    );

    expect(api.doDeleteAuthentication).not.toHaveBeenCalled();

    await act(async () => {
      wrapper.find(Button).at(1).simulate('click');
    });

    expect(api.doDeleteAuthentication).toHaveBeenCalledWith('authid');
    expect(setState).toHaveBeenCalledWith({
      type: 'removeAuthRejected',
      authId: 'authid',
    });
    expect(actions.addMessage).toHaveBeenCalledWith('Authentication was not deleted successfully.', 'danger', 'Some error');
  });

  it('close on icon/cancel', () => {
    const wrapper = mount(
      componentWrapperIntl(
        <sourceEditContext.Provider value={{ setState, source, sourceType }}>
          <RemoveAuth {...initialProps} />
        </sourceEditContext.Provider>
      ),
      store
    );

    expect(setState).not.toHaveBeenCalled();

    wrapper.find(Button).first().simulate('click');
    expect(setState).toHaveBeenCalledWith({ type: 'closeAuthRemoving' });
    setState.mockClear();

    wrapper.find(Button).last().simulate('click');
    expect(setState).toHaveBeenCalledWith({ type: 'closeAuthRemoving' });
  });
});
