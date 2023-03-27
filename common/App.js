import { Loader, PerspectiveCamera, Scene, sRGBEncoding, WebGLRenderer } from 'three';
export class App {

	constructor() {

		const renderer = new WebGLRenderer( { antialias: true } );
		renderer.outputEncoding = sRGBEncoding;

		let startTime = - 1;
		renderer.setAnimationLoop( () => {

			const newTime = window.performance.now();
			if ( startTime === - 1 ) {

				startTime = newTime;

			}

			if ( this.update ) {

				const delta = Math.min( newTime - startTime, 1000 / 30 );
				this.update( 1e-3 * delta );

			}

			startTime = newTime;
			renderer.render( this.scene, this.camera );

		} );

		const camera = new PerspectiveCamera();
		camera.position.z = 5;

		this.scene = new Scene();
		this.camera = camera;
		this.renderer = renderer;
		this.update = null;
		this.loadingElement = null;
		this._fadeTimeout = - 1;

	}

	init( element ) {

		const { renderer, camera } = this;
		element.appendChild( renderer.domElement );

		window.addEventListener( 'resize', onResize );
		onResize();

		const { domElement } = renderer;
		domElement.style.opacity = '0';
		domElement.style.transition = 'opacity 0.5s ease';

		const loadingElement = document.createElement( 'div' );
		loadingElement.innerText = 'Loading';
		loadingElement.style.position = 'absolute';
		loadingElement.style.left = '0';
		loadingElement.style.bottom = '0';
		loadingElement.style.color = 'white';
		loadingElement.style.fontFamily = 'Helvetica, Arial, sans-serif';
		loadingElement.style.fontWeight = 'lighter';
		loadingElement.style.padding = '20px';
		loadingElement.style.fontSize = '1em';
		loadingElement.style.transition = 'opacity 0.5s ease';
		loadingElement.style.opacity = '0';
		this._fadeTimeout = setTimeout( () => {

			loadingElement.style.opacity = '0.5';

		}, 100 );

		element.appendChild( loadingElement );
		this.loadingElement = loadingElement;

		function onResize() {

			renderer.setSize( window.innerWidth, window.innerHeight );
			renderer.setPixelRatio( window.devicePixelRatio );

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

		}

	}

	toggleLoading() {

		setTimeout( () => {

			this.renderer.domElement.style.opacity = '1';
			this.loadingElement.style.opacity = '0';

		} );
		clearTimeout( this._fadeTimeout );

	}

}
