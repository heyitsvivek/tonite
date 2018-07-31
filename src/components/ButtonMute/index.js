/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** @jsx h */
import { h, Component } from 'preact';
import './style.scss';

import ButtonItem from '../ButtonItem';
import audio from '../../audio';

import icon from './icon.svg';
import iconDisabled from './icon-disabled.svg';

export default class MuteButton extends Component {
  constructor() {
    super();

    this.state = {
      muted: audio.isMuted(),
    };

    this.toggleMute = this.toggleMute.bind(this);
  }

  toggleMute() {
    this.setState({ muted: audio.toggleMute() });
  }

  render(props, { muted }) {
    return (
      <ButtonItem
        onClick={this.toggleMute}
        icon={muted ? iconDisabled : icon}
      />
    );
  }
}
