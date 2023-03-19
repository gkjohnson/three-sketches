import { App } from '../common/App.js';
import { SurfaceWalker, SurfacePoint } from './src/SurfaceWalker.js';
import { Group, Mesh, SphereGeometry, TorusKnotGeometry, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

( async () => {

    const app = new App();
    app.init( document.body );

    const { camera, scene, renderer } = app;
    camera.position.set( 5, 5, 5 );
    camera.lookAt( 0, 0, 0 );
    renderer.setClearColor( 0x111111 );

    const controls = new OrbitControls( camera, renderer.domElement );

    // const mesh = new Mesh( new TorusKnotGeometry() );
    // scene.add( mesh );

    const gltf = await new GLTFLoader().setMeshoptDecoder( MeshoptDecoder ).loadAsync( 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Hosmer.glb' );
    const mesh = gltf.scene.children[ 0 ];
    mesh.geometry.scale( 0.01, 0.01, 0.01 );
    mesh.geometry.rotateX( - Math.PI / 2 );
    // scene.add( mesh );

    const container = new Group();
    scene.add( container );

    const surf = new SurfaceWalker( mesh.geometry );

    const sampler = new MeshSurfaceSampler( mesh );
    sampler.build();
    sampler.sampleWeightedFaceIndex = function() {

        const cumulativeTotal = this.distribution[ this.distribution.length - 1 ];
        return this.binarySearch( this.randomFunction() * cumulativeTotal );

    };

    const pointInfo = [];
    for ( let i = 0; i < 1000; i ++ ) {

        const mesh = new Mesh( new SphereGeometry( 0.01 ) );
        mesh.material.color.set( 0xffffff );

        const surfacePoint = new SurfacePoint();
        surfacePoint.index = sampler.sampleWeightedFaceIndex();
        sampler.sampleFace( surfacePoint.index, surfacePoint );

        mesh.position.copy( surfacePoint );
        container.add( mesh );

        const info = {
            surfacePoint,
            mesh,
            direction: new Vector3( 0, 0, 1 ).randomDirection(),
        };
        pointInfo.push( info );

    }


    app.update = () => {

        pointInfo.forEach( info => {

            const { surfacePoint, mesh, direction } = info;
            direction.normalize().multiplyScalar( 0.001 );
            surf.movePoint( surfacePoint, direction, surfacePoint, direction );
            mesh.position.copy( surfacePoint );

        } );

    };

} )();
