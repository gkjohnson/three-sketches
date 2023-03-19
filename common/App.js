import { PerspectiveCamera, Scene, sRGBEncoding, WebGLRenderer } from 'three';
export class App {

    constructor() {
        
        const renderer = new WebGLRenderer( { antialias: true } );
        renderer.outputEncoding = sRGBEncoding;
        renderer.setAnimationLoop( () => {

            if ( this.update ) {

                this.update();

            }

            renderer.render( this.scene, this.camera );

        } );

        const camera = new PerspectiveCamera();
        camera.position.z = 5;

        this.scene = new Scene();
        this.camera = camera;
        this.renderer = renderer;
        this.update = null;

    }

    init( element ) {

        const { renderer, camera } = this;
        element.appendChild( renderer.domElement );

        window.addEventListener( 'resize', onResize );
        onResize();

        function onResize() {

            renderer.setSize( window.innerWidth, window.innerHeight );
            renderer.setPixelRatio( window.devicePixelRatio );

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

        }

    }

}