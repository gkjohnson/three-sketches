import { Loader, PerspectiveCamera, Scene, sRGBEncoding, WebGLRenderer } from 'three';
export class App {

    constructor() {
        
        const renderer = new WebGLRenderer( { antialias: true } );
        renderer.outputEncoding = sRGBEncoding;

        let startTime = window.performance.now();
        renderer.setAnimationLoop( () => {

            const newTime = window.performance.now();
            if ( this.update ) {

                this.update( 1e-3 * ( newTime - startTime ) );

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

    }

    init( element ) {

        const { renderer, camera } = this;
        element.appendChild( renderer.domElement );

        window.addEventListener( 'resize', onResize );
        onResize();

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
        loadingElement.style.transition = 'opacity 0.1s ease';
        loadingElement.style.opacity = '0';
        setTimeout( () => {

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

        this.loadingElement.style.opacity = '0';

    }

}