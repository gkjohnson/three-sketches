import { App } from '../common/App.js';
import { SurfaceWalker, SurfacePoint } from './src/SurfaceWalker.js';
import { Group, Mesh, MeshBasicMaterial, SphereGeometry, TorusKnotGeometry, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { InstancedSpheres } from './src/InstancedSphere.js';
import { InstancedTrails } from './src/InstancedTrails.js';

const POINT_COUNT = 100;
const SEGMENTS_COUNT = 2000;
const SPEED = 0.005;
( async () => {

    const app = new App();
    app.init( document.body );

    const { camera, scene, renderer } = app;
    camera.position.set( 6, 0, - 6 );
    camera.lookAt( 0, 0, 0 );
    renderer.setClearColor( 0x111111 );

    const controls = new OrbitControls( camera, renderer.domElement );

    // const mesh = new Mesh( new TorusKnotGeometry() );
    // scene.add( mesh );

    const gltf = await new GLTFLoader().setMeshoptDecoder( MeshoptDecoder ).loadAsync( 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Hosmer.glb' );
    const mesh = gltf.scene.children[ 0 ];
    mesh.geometry.scale( 0.005, 0.005, 0.005 );
    mesh.geometry.rotateX( - Math.PI / 2 );
    mesh.geometry.center();
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

    const spheres = new InstancedSpheres( new MeshBasicMaterial(), POINT_COUNT );

    const trails = new InstancedTrails( POINT_COUNT, SEGMENTS_COUNT );
    container.add( trails );
    trails.material.opacity = 0.35;
    trails.material.transparent = true;
    trails.material.depthWrite = false;

    const pointInfo = [];
    for ( let i = 0; i < POINT_COUNT; i ++ ) {

        const surfacePoint = new SurfacePoint();
        surfacePoint.index = sampler.sampleWeightedFaceIndex();
        sampler.sampleFace( surfacePoint.index, surfacePoint );
        trails.init( i, surfacePoint );

        const info = {
            surfacePoint,
            direction: new Vector3( 0, 0, 1 ).randomDirection(),
        };
        pointInfo.push( info );

    }


    const normal = new Vector3();
    const temp = new Vector3();
    app.toggleLoading();
    app.update = () => {

        for ( let i = 0, l = pointInfo.length; i < l; i ++ ) {

            const info = pointInfo[ i ];
            const { surfacePoint, direction } = info;
            direction.normalize().multiplyScalar( SPEED );
            surf.movePoint( surfacePoint, direction, surfacePoint, direction, normal );

            temp.copy( surfacePoint );//.addScaledVector( normal, 0.2 * ( 1.0 + Math.sin( window.performance.now() * 0.01 ) ) );
            spheres.setPosition( i, temp, 0.01 );
            trails.pushPoint( i, temp );

        }

    };

} )();
