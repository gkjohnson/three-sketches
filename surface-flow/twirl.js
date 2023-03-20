import { App } from '../common/App.js';
import { SurfaceWalker, SurfacePoint, TriangleFrame } from './src/SurfaceWalker.js';
import { Group, Mesh, MeshBasicMaterial, SphereGeometry, TorusKnotGeometry, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { InstancedSpheres } from './src/InstancedSphere.js';
import { InstancedTrails } from './src/InstancedTrails.js';

const POINT_COUNT = 500;
const SEGMENTS_COUNT = 1000;
const SPEED = 0.005;
( async () => {

    const app = new App();
    app.init( document.body );

    const { camera, scene, renderer } = app;
    camera.position.set( 9, 7, 8 );
    camera.lookAt( 0, 0, 0 );
    renderer.setClearColor( 0x111111 );

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.autoRotateSpeed = 0.5;
    controls.autoRotate = true;

    const gltf = await new GLTFLoader().setMeshoptDecoder( MeshoptDecoder ).loadAsync( 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Le_Transi_De_Rene_De_Chalon.glb' );
    const mesh = gltf.scene.children[ 0 ];
    mesh.geometry.scale( 0.005, 0.005, 0.005 );
    // mesh.geometry.rotateX( - Math.PI / 2 );
    mesh.geometry.center();
    scene.add( mesh );

    mesh.material = new MeshBasicMaterial();
    mesh.material.transparent = true;
    mesh.material.color.set( 0x111111 ).convertSRGBToLinear();
    mesh.material.opacity = 0.25;
    mesh.material.depthWrite = false;
    mesh.material.polygonOffset = true;
    mesh.material.polygonOffsetUnits = 1;
    mesh.material.polygonOffsetFactor = 1;
    mesh.renderOrder = 1;

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
    container.add( spheres );

    const trails = new InstancedTrails( POINT_COUNT, SEGMENTS_COUNT );
    container.add( trails );
    trails.material.opacity = 0.35;
    trails.material.transparent = true;
    trails.depthTest = false;

    const v0 = new Vector3();
    const v1 = new Vector3();
    const v2 = new Vector3();
    const pointInfo = [];

    for ( let i = 0; i < POINT_COUNT; i ++ ) {

        const surfacePoint = new SurfacePoint();
        surfacePoint.index = sampler.sampleWeightedFaceIndex();
        sampler.sampleFace( surfacePoint.index, surfacePoint );
        trails.init( i, surfacePoint );

        v0.copy( surfacePoint );
        v0.y = 0;
        v0.normalize();
        v1.set( 0, 1, 0 );

        const dir = new Vector3().crossVectors( v0, v1 );
        const info = {
            surfacePoint,
            direction: dir,
        };
        pointInfo.push( info );

    }


    const normal = new Vector3();
    const temp = new Vector3();
    app.toggleLoading();
    app.update = () => {

        controls.update();
        for ( let i = 0, l = pointInfo.length; i < l; i ++ ) {

            const info = pointInfo[ i ];
            const { surfacePoint, direction } = info;

            const frame = new TriangleFrame();
            surf._getFrame( surfacePoint.index, frame );

            v1.set( 0, 1, 0 );

            if ( Math.abs( v1.dot( frame.normal ) ) > 0.99 ) {

                v0.copy( surfacePoint );

            } else {

                v0.copy( frame.normal );

            }
            v0.y = 0;
            v0.normalize();

            v2.crossVectors( v0, v1 );
            v2.addScaledVector( surfacePoint, - 0.1 * Math.sign( frame.normal.y ) );
            v2.y = 0.25;

            direction.copy( v2 );

            direction.normalize().multiplyScalar( SPEED );
            surf.movePoint( surfacePoint, direction, surfacePoint, direction, normal );


            const dist = temp.distanceTo( camera.position );
            temp.copy( surfacePoint );
            spheres.setPosition( i, temp, 0.0005 * dist );
            trails.pushPoint( i, temp );

            if ( Math.random() < 0.5 * SPEED ) {

                surfacePoint.index = sampler.sampleWeightedFaceIndex();
                sampler.sampleFace( surfacePoint.index, surfacePoint );

                trails.pushPoint( i, surfacePoint, true );

            }

        }

    };

} )();
