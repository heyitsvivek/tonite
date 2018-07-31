/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 * @author customlogic / http://custom-logic.com
 *
 * WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 *
 * Firefox: http://mozvr.com/downloads/
 * Chromium: https://webvr.info/get-chrome
 *
 */
module.exports = function( THREE ){

	THREE.VREffect = function ( renderer, onError ) {

		var vrDisplay, vrDisplays;
		var eyeTranslationL = new THREE.Vector3();
		var eyeTranslationR = new THREE.Vector3();
		var renderRectL, renderRectR;
		var headMatrix = new THREE.Matrix4();
		var eyeMatrixL = new THREE.Matrix4();
		var eyeMatrixR = new THREE.Matrix4();
		var logging = false;

		var frameData = null;

		if ( 'VRFrameData' in window ) {

			frameData = new window.VRFrameData();

		}

		function gotVRDisplays( displays ) {

			vrDisplays = displays;

			if ( displays.length > 0 ) {

				vrDisplay = displays[ 0 ];

			} else {

				if ( onError ) onError( 'HMD not available' );

			}

		}

		if ( navigator.getVRDisplays ) {

			navigator.getVRDisplays().then( gotVRDisplays ).catch( function () {

				console.warn( 'THREE.VREffect: Unable to get VR Displays' );

			} );

		}

		//

		this.isPresenting = false;

		var scope = this;

		var rendererSize = renderer.getSize();
		var rendererUpdateStyle = false;
		var rendererPixelRatio = renderer.getPixelRatio();

		this.getVRDisplay = function () {

			return vrDisplay;

		};

		this.setVRDisplay = function ( value ) {

			vrDisplay = value;

		};

		this.getVRDisplays = function () {

			console.warn( 'THREE.VREffect: getVRDisplays() is being deprecated.' );
			return vrDisplays;

		};

		this.setSize = function ( width, height, updateStyle ) {

			rendererSize = { width: width, height: height };
			rendererUpdateStyle = updateStyle;

			if ( scope.isPresenting ) {

				var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
				//  The intention here is to only call render.setPixelRatio if we need to
				//  because that call redundantly calls renderer.setSize()
				//  and that can easily add 300ms overhead.
				if (renderer.getPixelRatio() !== 1) renderer.setPixelRatio(1);
				renderer.setSize( eyeParamsL.renderWidth * 2  * vrResolutionRatio, eyeParamsL.renderHeight  * vrResolutionRatio, false );

			} else {

				renderer.setPixelRatio( rendererPixelRatio );
				renderer.setSize( width, height, updateStyle );

			}

		};

		// VR presentation

		var canvas = renderer.domElement;
		var defaultLeftBounds = [ 0.0, 0.0, 0.5, 1.0 ];
		var defaultRightBounds = [ 0.5, 0.0, 0.5, 1.0 ];
		var vrResolutionRatio = 1.0;
		var fovRenderRatio = 1.0;

		function onVRDisplayPresentChange() {

			var wasPresenting = scope.isPresenting;
			scope.isPresenting = vrDisplay !== undefined && vrDisplay.isPresenting;

			if ( scope.isPresenting ) {

				var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
				var eyeWidth = eyeParamsL.renderWidth;
				var eyeHeight = eyeParamsL.renderHeight;

				if ( ! wasPresenting ) {

					rendererPixelRatio = renderer.getPixelRatio();
					rendererSize = renderer.getSize();

					//  The intention here is to only call render.setPixelRatio if we need to
					//  because that call redundantly calls renderer.setSize()
					//  and that can easily add 300ms overhead.
					if (rendererPixelRatio !== 1) renderer.setPixelRatio(1);
					renderer.setSize(eyeWidth * 2 * vrResolutionRatio, eyeHeight * vrResolutionRatio, false);

					scope.setVRResolutionRatio(vrResolutionRatio)
				}

			} else if ( wasPresenting ) {

				renderer.setPixelRatio( rendererPixelRatio );
				renderer.setSize( rendererSize.width, rendererSize.height, rendererUpdateStyle );

			}
			
		}

		window.addEventListener( 'vrdisplaypresentchange', onVRDisplayPresentChange, false );

		// Set the resolution draw and presented in VR. Changing this ratio will trigger a 
		// canvas resize which takes a bit of time. So don't call this function everyframe.
		this.setVRResolutionRatio = function (ratio) {

			vrResolutionRatio = THREE.Math.clamp(ratio, 0, 1.0);

			if ( vrDisplay !== undefined && vrDisplay.isPresenting ) {

				const resizeCanvas = true; // TODO: allow dynamic resize without resizing the canvas
				if ( scope.isPresenting && resizeCanvas ) {
					var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
					var eyeWidth = eyeParamsL.renderWidth;
					var eyeHeight = eyeParamsL.renderHeight;

					renderer.setSize(eyeWidth * 2 * vrResolutionRatio, eyeHeight * vrResolutionRatio, false);
				}

				// since we're already presenting, this doesn't need to be initiated by user interaction
				requestPresentToVRDisplay();
			}

		}
		this.getVRResolutionRatio = function () {

			return vrResolutionRatio;
		
		}

		// Set the ratio of the eye FOV you want to render. This basically adds a black border to the outside
		// of the view, reducing the amount of pixels that need to be rendered each frame
		this.setFOVRenderRatio = function (ratio) {

			fovRenderRatio = THREE.Math.clamp(ratio, 0, 1.0);

		}
		this.getFOVRenderRatio = function () {

			return fovRenderRatio;

		}

		function requestPresentToVRDisplay() {
			if (logging) {
				var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
				console.log("VR Effect vrResolutionRatio: ", vrResolutionRatio, " ", eyeParamsL.renderWidth * vrResolutionRatio, "x", eyeParamsL.renderHeight * vrResolutionRatio);
			}
			
			return vrDisplay.requestPresent([{ source: canvas }]);

		}


		this.setFullScreen = function ( boolean ) {

			return new Promise( function ( resolve, reject ) {

				if ( vrDisplay === undefined ) {

					reject( new Error( 'No VR hardware found.' ) );
					return;

				}

				if ( scope.isPresenting === boolean ) {

					resolve();
					return;

				}

				if ( boolean ) {

					resolve( requestPresentToVRDisplay() );

				} else {
					if (!vrDisplay.isPresenting) {
						resolve();
						return;
					}

					resolve( vrDisplay.exitPresent() );

				}

			} );

		};

		this.requestPresent = function () {

			return this.setFullScreen( true );

		};

		this.exitPresent = function () {

			return this.setFullScreen( false );

		};

		this.requestAnimationFrame = function ( f ) {

			if ( vrDisplay !== undefined ) {

				return vrDisplay.requestAnimationFrame( f );

			} else {

				return window.requestAnimationFrame( f );

			}

		};

		this.cancelAnimationFrame = function ( h ) {

			if ( vrDisplay !== undefined ) {

				vrDisplay.cancelAnimationFrame( h );

			} else {

				window.cancelAnimationFrame( h );

			}

		};

		this.submitFrame = function () {
			if ( vrDisplay !== undefined && vrDisplay.isPresenting ) {

				vrDisplay.submitFrame();

			}

		};

		this.autoSubmitFrame = true;

		// render

		var cameraL = new THREE.PerspectiveCamera();
		cameraL.layers.enable( 1 );

		var cameraR = new THREE.PerspectiveCamera();
		cameraR.layers.enable( 2 );

		this.render = function ( scene, camera, renderTarget, forceClear ) {

			if ( vrDisplay && scope.isPresenting ) {

				var autoUpdate = scene.autoUpdate;

				if ( autoUpdate ) {

					scene.updateMatrixWorld();
					scene.autoUpdate = false;

				}

				if ( Array.isArray( scene ) ) {

					console.warn( 'THREE.VREffect.render() no longer supports arrays. Use object.layers instead.' );
					scene = scene[ 0 ];

				}

				// do one clear for both eyes
				if ( renderer.autoClear || forceClear ) renderer.clear();
				const rendererAutoClear = renderer.autoClear;
				renderer.autoClear = false;

				// When rendering we don't care what the recommended size is, only what the actual size
				// of the backbuffer is.
				var size = renderer.getSize();
				var layers = vrDisplay.getLayers();
				var leftBounds;
				var rightBounds;

				if ( layers.length ) {

					var layer = layers[ 0 ];

					leftBounds = layer.leftBounds !== null && layer.leftBounds.length === 4 ? layer.leftBounds : defaultLeftBounds;
					rightBounds = layer.rightBounds !== null && layer.rightBounds.length === 4 ? layer.rightBounds : defaultRightBounds;

				} else {

					leftBounds = defaultLeftBounds;
					rightBounds = defaultRightBounds;

				}

				renderRectL = {
					x: Math.round( size.width * leftBounds[ 0 ] ),
					y: Math.round( size.height * leftBounds[ 1 ] ),
					width: Math.round( size.width * leftBounds[ 2 ] ),
					height: Math.round( size.height * leftBounds[ 3 ] )
				};
				renderRectR = {
					x: Math.round( size.width * rightBounds[ 0 ] ),
					y: Math.round( size.height * rightBounds[ 1 ] ),
					width: Math.round( size.width * rightBounds[ 2 ] ),
					height: Math.round( size.height * rightBounds[ 3 ] )
				};

				if ( renderTarget ) {

					renderer.setRenderTarget( renderTarget );
					renderTarget.scissorTest = true;

				} else {

					renderer.setRenderTarget( null );
					renderer.setScissorTest( true );

				}


				if ( camera.parent === null ) camera.updateMatrixWorld();

				camera.matrixWorld.decompose( cameraL.position, cameraL.quaternion, cameraL.scale );

				cameraR.position.copy( cameraL.position );
				cameraR.quaternion.copy( cameraL.quaternion );
				cameraR.scale.copy( cameraL.scale );

				if ( vrDisplay.getFrameData ) {

					vrDisplay.depthNear = camera.near;
					vrDisplay.depthFar = camera.far;

					vrDisplay.getFrameData( frameData );

					cameraL.projectionMatrix.elements = frameData.leftProjectionMatrix;
					cameraR.projectionMatrix.elements = frameData.rightProjectionMatrix;

					getEyeMatrices( frameData );

					cameraL.updateMatrix();
					cameraL.matrix.multiply( eyeMatrixL );
					cameraL.matrix.decompose( cameraL.position, cameraL.quaternion, cameraL.scale );

					cameraR.updateMatrix();
					cameraR.matrix.multiply( eyeMatrixR );
					cameraR.matrix.decompose( cameraR.position, cameraR.quaternion, cameraR.scale );

				} else {

					var eyeParamsL = vrDisplay.getEyeParameters( 'left' );
					var eyeParamsR = vrDisplay.getEyeParameters( 'right' );

					cameraL.projectionMatrix = fovToProjection( eyeParamsL.fieldOfView, true, camera.near, camera.far );
					cameraR.projectionMatrix = fovToProjection( eyeParamsR.fieldOfView, true, camera.near, camera.far );

					eyeTranslationL.fromArray( eyeParamsL.offset );
					eyeTranslationR.fromArray( eyeParamsR.offset );

					cameraL.translateOnAxis( eyeTranslationL, cameraL.scale.x );
					cameraR.translateOnAxis( eyeTranslationR, cameraR.scale.x );

				}

				// render left eye
				var leftEyeFOVReductionBorderWidth = renderRectL.width * (1 - fovRenderRatio) * 0.5;
				var leftEyeFOVReductionBorderHeight = renderRectL.height * (1 - fovRenderRatio) * 0.5;
				var leftEyeScissor = [ renderRectL.x + leftEyeFOVReductionBorderWidth, 
										 renderRectL.y + leftEyeFOVReductionBorderHeight, 
										 renderRectL.width - leftEyeFOVReductionBorderWidth * 2, 
										 renderRectL.height - leftEyeFOVReductionBorderHeight * 2]
				if ( renderTarget ) {
					
					renderTarget.viewport.set( renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height );
					renderTarget.scissor.set( leftEyeScissor[0], leftEyeScissor[1], leftEyeScissor[2], leftEyeScissor[3] );

				} else {

					renderer.setViewport( renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height );
					renderer.setScissor( leftEyeScissor[0], leftEyeScissor[1], leftEyeScissor[2], leftEyeScissor[3] );

				}
				renderer.render( scene, cameraL, renderTarget );

				// render right eye
				var rightEyeFOVReductionBorderWidth = renderRectR.width * (1 - fovRenderRatio) * 0.5;
				var rightEyeFOVReductionBorderHeight = renderRectR.height * (1 - fovRenderRatio) * 0.5;
				var rightEyeScissor = [ renderRectR.x + rightEyeFOVReductionBorderWidth, 
										 renderRectR.y + rightEyeFOVReductionBorderHeight, 
										 renderRectR.width - rightEyeFOVReductionBorderWidth * 2, 
										 renderRectR.height - rightEyeFOVReductionBorderHeight * 2]
				if ( renderTarget ) {

					renderTarget.viewport.set( renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height );
					renderTarget.scissor.set( rightEyeScissor[0], rightEyeScissor[1], rightEyeScissor[2], rightEyeScissor[3] );

				} else {

					renderer.setViewport( renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height );
					renderer.setScissor( rightEyeScissor[0], rightEyeScissor[1], rightEyeScissor[2], rightEyeScissor[3] );

				}
				renderer.render( scene, cameraR, renderTarget );
				
				if ( renderTarget ) {

					renderTarget.viewport.set( 0, 0, size.width, size.height );
					renderTarget.scissor.set( 0, 0, size.width, size.height );
					renderTarget.scissorTest = false;
					renderer.setRenderTarget( null );

				} else {

					renderer.setViewport( 0, 0, size.width, size.height );
					renderer.setScissorTest( false );

				}

				if ( autoUpdate ) {

					scene.autoUpdate = true;

				}

				if ( scope.autoSubmitFrame ) {

					scope.submitFrame();

				}

				renderer.autoClear = rendererAutoClear;

				return;

			}

			// Regular render mode if not HMD
			
			renderer.render( scene, camera, renderTarget, forceClear );
	
		};

		this.dispose = function () {

			window.removeEventListener( 'vrdisplaypresentchange', onVRDisplayPresentChange, false );

		};

		this.setLogging = function(bool) {

			logging = bool;
			
		}

		//

		var poseOrientation = new THREE.Quaternion();
		var posePosition = new THREE.Vector3();

		// Compute model matrices of the eyes with respect to the head.
		function getEyeMatrices( frameData ) {

			// Compute the matrix for the position of the head based on the pose
			if ( frameData.pose.orientation ) {

				poseOrientation.fromArray( frameData.pose.orientation );
				headMatrix.makeRotationFromQuaternion( poseOrientation );

			}	else {

				headMatrix.identity();

			}

			if ( frameData.pose.position ) {

				posePosition.fromArray( frameData.pose.position );
				headMatrix.setPosition( posePosition );

			}

			// The view matrix transforms vertices from sitting space to eye space. As such, the view matrix can be thought of as a product of two matrices:
			// headToEyeMatrix * sittingToHeadMatrix

			// The headMatrix that we've calculated above is the model matrix of the head in sitting space, which is the inverse of sittingToHeadMatrix.
			// So when we multiply the view matrix with headMatrix, we're left with headToEyeMatrix:
			// viewMatrix * headMatrix = headToEyeMatrix * sittingToHeadMatrix * headMatrix = headToEyeMatrix

			eyeMatrixL.fromArray( frameData.leftViewMatrix );
			eyeMatrixL.multiply( headMatrix );
			eyeMatrixR.fromArray( frameData.rightViewMatrix );
			eyeMatrixR.multiply( headMatrix );

			// The eye's model matrix in head space is the inverse of headToEyeMatrix we calculated above.

			eyeMatrixL.getInverse( eyeMatrixL );
			eyeMatrixR.getInverse( eyeMatrixR );

		}

		function fovToNDCScaleOffset( fov ) {

			var pxscale = 2.0 / ( fov.leftTan + fov.rightTan );
			var pxoffset = ( fov.leftTan - fov.rightTan ) * pxscale * 0.5;
			var pyscale = 2.0 / ( fov.upTan + fov.downTan );
			var pyoffset = ( fov.upTan - fov.downTan ) * pyscale * 0.5;
			return { scale: [ pxscale, pyscale ], offset: [ pxoffset, pyoffset ] };

		}

		function fovPortToProjection( fov, rightHanded, zNear, zFar ) {

			rightHanded = rightHanded === undefined ? true : rightHanded;
			zNear = zNear === undefined ? 0.01 : zNear;
			zFar = zFar === undefined ? 10000.0 : zFar;

			var handednessScale = rightHanded ? - 1.0 : 1.0;

			// start with an identity matrix
			var mobj = new THREE.Matrix4();
			var m = mobj.elements;

			// and with scale/offset info for normalized device coords
			var scaleAndOffset = fovToNDCScaleOffset( fov );

			// X result, map clip edges to [-w,+w]
			m[ 0 * 4 + 0 ] = scaleAndOffset.scale[ 0 ];
			m[ 0 * 4 + 1 ] = 0.0;
			m[ 0 * 4 + 2 ] = scaleAndOffset.offset[ 0 ] * handednessScale;
			m[ 0 * 4 + 3 ] = 0.0;

			// Y result, map clip edges to [-w,+w]
			// Y offset is negated because this proj matrix transforms from world coords with Y=up,
			// but the NDC scaling has Y=down (thanks D3D?)
			m[ 1 * 4 + 0 ] = 0.0;
			m[ 1 * 4 + 1 ] = scaleAndOffset.scale[ 1 ];
			m[ 1 * 4 + 2 ] = - scaleAndOffset.offset[ 1 ] * handednessScale;
			m[ 1 * 4 + 3 ] = 0.0;

			// Z result (up to the app)
			m[ 2 * 4 + 0 ] = 0.0;
			m[ 2 * 4 + 1 ] = 0.0;
			m[ 2 * 4 + 2 ] = zFar / ( zNear - zFar ) * - handednessScale;
			m[ 2 * 4 + 3 ] = ( zFar * zNear ) / ( zNear - zFar );

			// W result (= Z in)
			m[ 3 * 4 + 0 ] = 0.0;
			m[ 3 * 4 + 1 ] = 0.0;
			m[ 3 * 4 + 2 ] = handednessScale;
			m[ 3 * 4 + 3 ] = 0.0;

			mobj.transpose();
			return mobj;

		}

		function fovToProjection( fov, rightHanded, zNear, zFar ) {

			var DEG2RAD = Math.PI / 180.0;

			var fovPort = {
				upTan: Math.tan( fov.upDegrees * DEG2RAD ),
				downTan: Math.tan( fov.downDegrees * DEG2RAD ),
				leftTan: Math.tan( fov.leftDegrees * DEG2RAD ),
				rightTan: Math.tan( fov.rightDegrees * DEG2RAD )
			};

			return fovPortToProjection( fovPort, rightHanded, zNear, zFar );

		}

	};
}
