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
import { h } from 'preact';
import './style.scss';

import Container from '../../components/Container';
import Align from '../../components/Align';
import ButtonPlay from '../../components/ButtonPlay';

export default function PressPlayToStart({ onClick }) {
  return (
    <Container>
      <Align type="center">
        <ButtonPlay onClick={onClick} large />
        <a onClick={onClick} className="play-button-label">Press play to Dance Tonite</a>
      </Align>
    </Container>
  );
}